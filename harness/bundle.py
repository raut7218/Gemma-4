"""Loads a submission bundle into an agent tree: agent.yaml, sub_agents via config_path, and !include."""
from __future__ import annotations

from pathlib import Path

import yaml

WORKFLOW = {"SequentialAgent", "ParallelAgent"}


def load_yaml(path: Path, root: Path):
    class Loader(yaml.SafeLoader):
        pass

    def include(loader, node):
        rel = loader.construct_scalar(node)
        # Relative to the including file first, then to the bundle root: the official resolution is unknown.
        f = next((p for p in (path.parent / rel, root / rel) if p.exists()), None)
        if f is None:
            raise FileNotFoundError(f"!include {rel} (from {path})")
        return load_yaml(f, root) if f.suffix in (".yaml", ".yml") else f.read_text()

    Loader.add_constructor("!include", include)
    return yaml.load(path.read_text(), Loader=Loader) or {}


def load_agent(path: Path, root: Path) -> dict:
    d = load_yaml(path, root)
    d.setdefault("agent_class", "LlmAgent")
    if d["agent_class"] not in WORKFLOW | {"LlmAgent"}:
        raise ValueError(f"{path}: unsupported agent_class {d['agent_class']}")
    d["sub_agents"] = [load_agent(path.parent / ref["config_path"], root) for ref in d.get("sub_agents") or []]
    if d["agent_class"] == "LlmAgent" and d["sub_agents"]:
        raise ValueError(f"{path}: LlmAgent sub_agents (transfer) are not supported locally")
    return d


def load_submission(d: Path) -> dict:
    ev = (yaml.safe_load((d / "eval_config.yaml").read_text()) or {}).get("evaluation", {})
    sp = d / "configs" / "sampling.yaml"
    sampling = (yaml.safe_load(sp.read_text()) or {}) if sp.exists() else {}
    return {"root": load_agent(d / "agent.yaml", d), "eval": ev, "sampling": sampling}
