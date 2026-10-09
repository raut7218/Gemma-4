"""Static bundle check mirroring the official adk_submission 0.2.11 / swegemma 0.2.7 compile rules.

  uv run python -m harness.check_bundle submission bundles/parallel-investigate

Rules are transcribed from the released source (schema.py, context.py, yaml_loader.py, limits.py,
swegemma/config.py, swegemma/tools, swegemma/models/registry.py, swegemma/harness/agent_runner.py);
it does not import or run that code. A pass here is necessary, not sufficient: the real compiler
also builds the ADK objects.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

EXTENSIONS = {".yaml", ".yml", ".md", ".txt", ".py", ".json", ".safetensors"}
TOOLS = {"run_command", "read_file", "write_file", "edit_file", "submit_patch", "get_status",
         "get_code_neighbors", "search_similar_code", "get_code_subgraph"}
MODELS = {"gemma-4-31b-it-qat-w4a16-ct", "gemma-4-31b-it", "gemma-4-27b-it", "gemma-4-26b-a4b-it", "gemma-4-12b-it",
          "gemma-4-9b-it", "gemma-4-e4b-it", "gemma-4-e2b-it", "gemma-4-31b", "gemma-4-27b", "gemma-4-26b-a4b",
          "gemma-4-12b", "gemma-4-9b", "gemma-4-e4b", "gemma-4-e2b", "diffusiongemma-26b-a4b-it"}
BASE = {"name", "description", "agent_class", "before_agent_callbacks", "after_agent_callbacks"}
FIELDS = {
    "LlmAgent": BASE | {"model", "adapter", "instruction", "output_key", "include_contents", "disallow_transfer_to_parent",
                        "disallow_transfer_to_peers", "tools", "skills", "sub_agents", "generate_content_config",
                        "before_model_callbacks", "after_model_callbacks", "before_tool_callbacks", "after_tool_callbacks"},
    "SequentialAgent": BASE | {"sub_agents"},
    "ParallelAgent": BASE | {"sub_agents"},
    "LoopAgent": BASE | {"sub_agents", "max_iterations"},
}
GEN = {"temperature", "top_p", "top_k", "max_output_tokens", "stop_sequences", "presence_penalty", "frequency_penalty",
       "response_mime_type", "seed", "thinking_config"}
THINK = {"thinking_budget", "include_thoughts", "thinking_level"}
EVAL = {"timeout_seconds", "max_time_minutes", "max_tool_calls", "max_turns"}
# Session state set by swegemma before the run; "hints" only when the task has non-empty hints (public tasks have none).
STATE = {"problem_description"}
_VAR = re.compile(r"(?<![$\\{])\{([A-Za-z_][\w:]*)(\?)?\}")


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


class Checker:
    def __init__(self, root: Path):
        self.root, self.errors, self.warnings, self.names, self.output_keys = root.resolve(), [], [], [], set()

    def err(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def load(self, path: Path):
        checker = self

        class Loader(yaml.SafeLoader):
            pass

        def include(loader, node):  # relative to the including file only, and inside the root
            rel = loader.construct_scalar(node)
            f = (path.parent / rel).resolve()
            if Path(rel).is_absolute() or ".." in Path(rel).parts or not f.is_relative_to(checker.root) or not f.exists():
                checker.err(path.name, f"!include {rel} must exist relative to {path.parent.relative_to(checker.root) or '.'}")
                return ""
            return checker.load(f) if f.suffix in (".yaml", ".yml") else f.read_text()

        Loader.add_constructor("!include", include)
        return yaml.load(path.read_text(), Loader=Loader)

    def resolve_ref(self, cur: Path, rel: str, where: str) -> Path | None:
        if Path(rel).is_absolute() or ".." in Path(rel).parts:
            self.err(where, f"config_path {rel} has a traversal component")
            return None
        cand = cur / rel  # official: the referencing file's dir if the file exists there, else the root
        target = cand if cur.resolve() != self.root and cand.exists() else self.root / rel
        if not target.exists() or target.suffix not in (".yaml", ".yml"):
            self.err(where, f"config_path {rel} not found (from {cur.relative_to(self.root) or '.'})")
            return None
        return target

    def agent(self, path: Path, depth=0):
        where = str(path.relative_to(self.root))
        d = self.load(path)
        if not isinstance(d, dict):
            return self.err(where, "agent config must be a mapping")
        cls = d.get("agent_class") or "LlmAgent"
        if cls not in FIELDS:
            return self.err(where, f"unknown agent_class {cls}")
        for k in set(d) - FIELDS[cls]:
            self.err(where, f"field '{k}' is not allowed on {cls} (extra=forbid)")
        if not isinstance(d.get("name"), str) or not d["name"]:
            self.err(where, "name is required")
        elif d["name"] in self.names:
            self.err(where, f"duplicate agent name {d['name']}")
        else:
            self.names.append(d["name"])
        if cls == "LlmAgent":
            self.llm(d, where)
        elif not d.get("sub_agents"):
            self.err(where, f"{cls} needs sub_agents")
        if cls == "LoopAgent" and d.get("max_iterations") is not None and not (_num(d["max_iterations"]) and d["max_iterations"] >= 1):
            self.err(where, "max_iterations must be >= 1")
        for ref in d.get("sub_agents") or []:
            if not isinstance(ref, dict) or set(ref) != {"config_path"}:
                self.err(where, f"sub_agents entries take only config_path, got {ref!r}")
                continue
            t = self.resolve_ref(path.parent, str(ref["config_path"]), where)
            if t:
                self.agent(t, depth + 1)

    def llm(self, d: dict, where: str):
        if not isinstance(d.get("instruction"), str):
            self.err(where, "instruction (string) is required")
        if d.get("model") is None:
            self.warnings.append(f"{where}: no model; the agent inherits none and fails at run time unless set")
        elif d["model"] not in MODELS:
            self.err(where, f"model {d['model']} is not a registered alias")
        if d.get("include_contents", "default") not in ("default", "none"):
            self.err(where, "include_contents must be default or none")
        for t in d.get("tools") or []:
            if isinstance(t, dict):
                if set(t) != {"agent_tool"}:
                    self.err(where, f"tool entry {t!r} must be a name or agent_tool")
            elif t not in TOOLS:
                self.err(where, f"unknown tool {t}")
        g = d.get("generate_content_config") or {}
        for k in set(g) - GEN:
            self.err(where, f"generate_content_config.{k} is not allowed")
        for k, lo, hi in (("temperature", 0, None), ("top_p", 0, 1), ("top_k", 1, None), ("max_output_tokens", 1, 32768)):
            v = g.get(k)
            if v is not None and (not _num(v) or v < lo or (hi is not None and v > hi)):
                self.err(where, f"{k}={v!r} out of range")
        tc = g.get("thinking_config") or {}
        for k in set(tc) - THINK:
            self.err(where, f"thinking_config.{k} is not allowed")
        b = tc.get("thinking_budget")
        if b is not None and (not _num(b) or not 1 <= b <= 32768):
            self.err(where, f"thinking_budget={b!r}: the schema requires 1..32768 (use include_thoughts: false to turn thinking off)")
        if not tc or ("include_thoughts" not in tc and "thinking_level" not in tc and b is None):
            self.warnings.append(f"{where}: thinking is ON by default (thinking_budget 4096 merged in); set include_thoughts: false to disable")
        if d.get("output_key"):
            self.output_keys.add(d["output_key"])
        self.instructions.append((where, d.get("instruction") or ""))

    def run(self) -> bool:
        self.instructions = []
        for p in self.root.rglob("*"):
            if p.is_file() and not p.name.startswith(".") and p.suffix.lower() not in EXTENSIONS:
                self.err(str(p.relative_to(self.root)), "file type not allowed in a submission")
        roots = [self.root / n for n in ("agent.yaml", "root_agent.yaml") if (self.root / n).exists()]
        if not roots:
            self.err(".", "no agent.yaml or root_agent.yaml")
        else:
            self.agent(roots[0])
        ev = self.root / "eval_config.yaml"
        e = (yaml.safe_load(ev.read_text()) or {}).get("evaluation", {}) if ev.exists() else {}
        for k in set(e) - EVAL:
            self.warnings.append(f"eval_config.yaml: unknown key evaluation.{k}")
        for where, text in self.instructions:
            for name, opt in _VAR.findall(text):
                if not opt and name not in STATE | self.output_keys:
                    self.err(where, f"{{{name}}} is not always in state; ADK raises KeyError. Use {{{name}?}}")
        return not self.errors


def main(paths: list[str]) -> int:
    ok = True
    for p in paths or ["submission"]:
        c = Checker(Path(p))
        good = c.run()
        ok &= good
        print(f"{'PASS' if good else 'FAIL'} {p}  agents={c.names}")
        for m in c.errors:
            print(f"  error: {m}")
        for m in c.warnings:
            print(f"  warn:  {m}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
