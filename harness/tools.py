"""The six core swegemma tools (run_command, read_file, edit_file, write_file, get_status, submit_patch), plus
ADK's run_skill_script for agents that declare skills.

Graph tools (search_similar_code / get_code_neighbors / get_code_subgraph) are not implemented yet, nor are
load_skill / load_skill_resource. Every tool returns a JSON string, with the same truncation caps and budget
gate as the real harness.
"""
from __future__ import annotations

import json
import re
import shlex
import shutil
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from .sandbox import Sandbox

MAX_STDOUT, MAX_LINES, MAX_CHARS = 5000, 150, 10000


@dataclass
class Budget:
    max_time_minutes: float = 7.0
    max_tool_calls: int = 45
    max_turns: int = 80
    timeout_seconds: int = 240


def _ok(**kw) -> str:
    return json.dumps({"status": "ok", **kw})


def _err(kind: str, msg: str, **details) -> str:
    return json.dumps({"status": "error", "error_type": kind, "error_message": msg, "details": details})


@dataclass
class Ctx:
    sb: Sandbox
    budget: Budget
    start: float = field(default_factory=time.time)
    calls: int = 0
    patch_submitted: bool = False
    patch: str = ""
    turns: int = 0
    aborted: str = ""  # set when a parallel branch ends the whole session (overflow, LLM error, budget)
    skills: dict = field(default_factory=dict)  # skill name -> its directory in the bundle
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def take_turn(self) -> bool:
        """Counts one model call against max_turns, shared by every agent in the tree."""
        with self.lock:
            if self.turns >= self.budget.max_turns:
                return False
            self.turns += 1
            return True

    def remaining_s(self) -> float:
        return self.budget.max_time_minutes * 60 - (time.time() - self.start)

    def out_of_budget(self) -> str | None:
        if self.remaining_s() <= 0:
            return "time"
        if self.calls >= self.budget.max_tool_calls:
            return "tool_calls"
        return None

    # -- tools -------------------------------------------------------------------------
    def run_command(self, command: str) -> str:
        to = min(self.budget.timeout_seconds, max(5, int(self.remaining_s())))
        code, out, err = self.sb.run(command, timeout=to)
        o, e = out[:MAX_STDOUT], err[:MAX_STDOUT]
        if code == 124:
            return _err("TimeoutExceeded", f"Command exceeded {to}s", stdout=o, stderr=e)
        if code != 0:
            return _err("CommandError", e[-500:] or f"exit {code}", stdout=o, stderr=e, exit_code=code)
        return _ok(stdout=o, stderr=e, exit_code=0)

    def _path(self, fp: str):
        # like swegemma's _resolve_workspace_path: absolute paths outside /workspace (e.g. /tmp) are rejected
        fp = re.sub(r"^/workspace(/|$)", "", fp)
        if fp.startswith("/") or ".." in fp.split("/"):
            raise ValueError(f"Path traversal detected: '{fp}' escapes workspace root.")
        return self.sb.ws / fp

    def read_file(self, filepath: str, start_line: int | None = None, end_line: int | None = None) -> str:
        try:
            p = self._path(filepath)
            lines = p.read_text(errors="replace").splitlines()
        except Exception as ex:
            return _err("FileReadError", str(ex))
        s = max(1, int(start_line or 1))
        e = min(len(lines), int(end_line or len(lines)))
        sel, chars, trunc = [], 0, False
        for i in range(s - 1, e):
            if len(sel) >= MAX_LINES or chars + len(lines[i]) + 1 > MAX_CHARS:
                trunc = True
                break
            sel.append(lines[i]); chars += len(lines[i]) + 1
        return _ok(filepath=filepath, content="\n".join(sel), start_line=s, end_line=s + len(sel) - 1,
                   total_lines=len(lines), is_truncated=trunc)

    def edit_file(self, filepath: str, old_string: str, new_string: str, allow_multiple: bool = False) -> str:
        try:
            p = self._path(filepath)
            text = p.read_text().replace("\r\n", "\n")
        except Exception as ex:
            return _err("FileEditError", str(ex))
        if not text or not old_string:
            return _err("FileEditError", "file or old_string is empty")
        old_string, new_string = old_string.replace("\r\n", "\n"), new_string.replace("\r\n", "\n")
        n, strategy = text.count(old_string), "exact"
        if n == 0:  # flexible: line-by-line, whitespace-insensitive match, re-indent new_string
            tl, ol = text.split("\n"), [l.strip() for l in old_string.strip("\n").split("\n")]
            hits = [i for i in range(len(tl) - len(ol) + 1) if [l.strip() for l in tl[i:i + len(ol)]] == ol]
            if hits:
                n, strategy = len(hits), "flexible"
                if n == 1 or allow_multiple:
                    for i in reversed(hits if allow_multiple else hits[:1]):
                        ind = re.match(r"\s*", tl[i]).group(0)
                        base = re.match(r"\s*", old_string.strip("\n").split("\n")[0]).group(0)
                        nl = [(ind + l[len(base):] if l.startswith(base) else ind + l.lstrip()) if l.strip() else l
                              for l in new_string.strip("\n").split("\n")]
                        tl[i:i + len(ol)] = nl
                    text2 = "\n".join(tl)
        if n == 0:
            return _err("FileEditError", "old_string not found in file")
        if n > 1 and not allow_multiple:
            return _err("FileEditError", f"old_string matches {n} places; add context or set allow_multiple")
        if strategy == "exact":
            text2 = text.replace(old_string, new_string) if allow_multiple else text.replace(old_string, new_string, 1)
        p.write_text(text2)
        return _ok(filepath=filepath, occurrences=n, strategy=strategy)

    def write_file(self, filepath: str, content: str) -> str:
        try:
            p = self._path(filepath)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content)
        except Exception as ex:
            return _err("FileWriteError", str(ex))
        return _ok(filepath=filepath, size=len(content))

    def get_status(self) -> str:
        b = self.budget
        return _ok(tool_calls_used=self.calls, patch_submitted=self.patch_submitted, patch_size=len(self.patch),
                   tool_calls_remaining=b.max_tool_calls - self.calls, max_tool_calls=b.max_tool_calls,
                   time_seconds_remaining=round(self.remaining_s(), 1), max_time_minutes=b.max_time_minutes,
                   max_turns=b.max_turns, command_timeout_seconds=b.timeout_seconds)

    def submit_patch(self) -> str:
        self.patch = self.sb.extract_patch()
        self.patch_submitted = True
        return _ok(patch_size=len(self.patch), files_changed=self.patch.count("diff --git"))

    def run_skill_script(self, skill_name: str, file_path: str, args=None, short_options=None, positional_args=None) -> str:
        """ADK's SkillToolset: the skill is copied to a temp dir, which is the script's cwd, and the script runs
        with the sandbox's python; arguments map to argv as in _build_wrapper_code. Scripts find the workspace
        through SWE_WORKSPACE here (/workspace in the scorer's container)."""
        d = self.skills.get(skill_name)
        rel = file_path if file_path.startswith("scripts/") else f"scripts/{file_path}"
        if d is None or not (Path(d) / rel).is_file():
            return json.dumps({"error": f"no script {rel} in skill {skill_name!r}", "error_code": "SCRIPT_NOT_FOUND"})
        argv = [str(v) for v in args] if isinstance(args, list) else []
        if isinstance(args, dict):
            argv += [x for k, v in args.items() for x in (f"--{k}", str(v))]
        argv += [x for k, v in (short_options or {}).items() for x in (f"-{k}", str(v))]
        argv += ["--", *map(str, positional_args)] if positional_args else []
        td = tempfile.mkdtemp(dir=self.sb.tmp)
        shutil.copytree(d, td, dirs_exist_ok=True)
        to = min(self.budget.timeout_seconds, max(5, int(self.remaining_s())))
        cmd = f"cd {shlex.quote(td)} && SWE_WORKSPACE={shlex.quote(str(self.sb.ws))} python3 {shlex.join([rel, *argv])}"
        code, out, err = self.sb.run(cmd, timeout=to, rewrite=False)
        shutil.rmtree(td, ignore_errors=True)
        if code:
            return json.dumps({"error": f"Failed to execute script '{rel}': exited with code {code}\n{err[-300:]}", "error_code": "EXECUTION_ERROR"})
        return json.dumps({"skill_name": skill_name, "file_path": rel, "stdout": out, "stderr": err,
                           "status": "warning" if err and out else "error" if err else "success"})

    FREE = {"get_status", "submit_patch"}

    def call(self, name: str, args: dict, allowed: list[str] | None = None) -> str:
        fn = getattr(self, name, None)
        if name not in TOOL_NAMES | {SKILL_TOOL} or fn is None or (allowed is not None and name not in allowed):
            return _err("UnknownTool", f"unknown tool {name}")
        if name not in self.FREE:
            with self.lock:  # parallel branches share one budget
                why = self.out_of_budget()
                if why:
                    return _err("BudgetExhausted", f"{why} budget exhausted")
                self.calls += 1
        try:
            res = fn(**args)
        except TypeError as ex:
            return _err("ValidationError", str(ex))
        left = self.budget.max_tool_calls - self.calls
        if self.calls >= 20 and left <= 10 and res.startswith("{"):
            d = json.loads(res)
            d["budget_warning"] = f"Only {left} tool call(s) remaining ({self.calls}/{self.budget.max_tool_calls} used). Finalize your edits and call submit_patch soon."
            res = json.dumps(d)
        return res


def _fn(name, desc, props, req):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": req}}}


S, I, B = {"type": "string"}, {"type": "integer"}, {"type": "boolean"}
SCHEMAS = [
    _fn("run_command", "Run a bash command in /workspace. Output capped at 5000 chars.", {"command": S}, ["command"]),
    _fn("read_file", "Read a file (max 150 lines / 10000 chars per call, 1-indexed inclusive).",
        {"filepath": S, "start_line": I, "end_line": I}, ["filepath"]),
    _fn("edit_file", "Replace old_string with new_string in an existing file; old_string must match exactly once.",
        {"filepath": S, "old_string": S, "new_string": S, "allow_multiple": B}, ["filepath", "old_string", "new_string"]),
    _fn("write_file", "Create or overwrite a file.", {"filepath": S, "content": S}, ["filepath", "content"]),
    _fn("get_status", "Show remaining budget and patch status (free).", {}, []),
    _fn("submit_patch", "Capture the current working tree modifications as your submission (free). You can submit multiple times; only the final submission is evaluated.", {}, []),
]
TOOL_NAMES = {s["function"]["name"] for s in SCHEMAS}
# Offered only to agents with skills (ADK adds the SkillToolset then); same parameters as google-adk 1.36.
SKILL_TOOL = "run_skill_script"
SKILL_SCHEMA = _fn(SKILL_TOOL, "Executes a script from a skill's scripts/ directory.",
                   {"skill_name": S, "file_path": S, "args": {"anyOf": [{"type": "object"}, {"type": "array", "items": S}]},
                    "short_options": {"type": "object"}, "positional_args": {"type": "array", "items": S}},
                   ["skill_name", "file_path"])
