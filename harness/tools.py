"""The six core swegemma tools (run_command, read_file, edit_file, write_file, get_status, submit_patch).

Graph tools (search_similar_code / get_code_neighbors / get_code_subgraph) are not implemented yet.
Every tool returns a JSON string, with the same truncation caps and budget gate as the real harness.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field

from .sandbox import Sandbox

MAX_STDOUT, MAX_LINES, MAX_CHARS = 5000, 150, 10000


@dataclass
class Budget:
    max_time_minutes: float = 4.5
    max_tool_calls: int = 40
    max_turns: int = 80
    timeout_seconds: int = 180


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
        fp = re.sub(r"^/workspace/?", "", fp).lstrip("/")
        if ".." in fp.split("/"):
            raise ValueError("path traversal not allowed")
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
        files = len(re.findall(r"^diff --git ", self.patch, re.M))
        return _ok(patch_size=len(self.patch), files_changed=files)

    FREE = {"get_status", "submit_patch"}

    def call(self, name: str, args: dict) -> str:
        fn = getattr(self, name, None)
        if name not in TOOL_NAMES or fn is None:
            return _err("UnknownTool", f"unknown tool {name}")
        if name not in self.FREE:
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
    _fn("submit_patch", "Record the current git diff as your final patch (free). Call last.", {}, []),
]
TOOL_NAMES = {s["function"]["name"] for s in SCHEMAS}
