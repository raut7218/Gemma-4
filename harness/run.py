"""Local harness CLI.

  uv run python -m harness.run --agent gold  --task-ids requests_6592          # pipeline sanity check
  uv run python -m harness.run --agent noop  --task-ids requests_6592          # must NOT resolve
  LLM_API_KEY=... uv run python -m harness.run --agent llm --base-url URL --model NAME --task-ids requests_6592
"""
from __future__ import annotations

import argparse
import json
import time
import traceback
from pathlib import Path

import yaml

from .agent import run_agent
from .sandbox import Sandbox
from .tools import Budget, Ctx
from .verify import verify

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def load_tasks(ids: list[str] | None) -> list[dict]:
    rows = [json.loads(l) for l in (DATA / "tasks.jsonl").open()]
    have = {p.stem for p in (DATA / "snapshots").glob("*.tgz")}
    rows = [r for r in rows if r["instance_id"] in have]
    return [r for r in rows if not ids or r["instance_id"] in ids]


def load_submission(d: Path) -> dict:
    ev = (yaml.safe_load((d / "eval_config.yaml").read_text()) or {}).get("evaluation", {})
    sampling = yaml.safe_load((d / "configs" / "sampling.yaml").read_text()) or {}
    return {"system": (d / "prompts" / "system.md").read_text(), "eval": ev, "sampling": sampling}


def classify(reason: str, patch: str, v: dict | None) -> str:
    if v and v["resolved"]:
        return "RESOLVED"
    if reason == "context_overflow":
        return "CONTEXT_OVERFLOW"
    if not patch.strip():
        return {"time": "BUDGET_EXHAUSTED", "turns": "BUDGET_EXHAUSTED", "no_tool_calls": "LOOP_BREAKOUT",
                "llm_error": "LLM_ERROR"}.get(reason, "NO_PATCH")
    return (v or {}).get("error") or "TESTS_FAILED"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", choices=["llm", "gold", "noop"], default="llm")
    ap.add_argument("--submission", default=str(ROOT / "submission"))
    ap.add_argument("--task-ids", nargs="*")
    ap.add_argument("--base-url", default="http://127.0.0.1:8000/v1")
    ap.add_argument("--model", default="gemma-4-31b-it-qat-w4a16-ct")
    ap.add_argument("--extra-body", default="{}", help="JSON merged into the request, e.g. chat_template_kwargs")
    ap.add_argument("--results-dir", default=None)
    ap.add_argument("--venv", default=str(ROOT / ".venv-sandbox"))
    a = ap.parse_args()

    sub = load_submission(Path(a.submission))
    budget = Budget(**{k: v for k, v in sub["eval"].items() if k in Budget.__dataclass_fields__})
    out = Path(a.results_dir or ROOT / "results" / time.strftime("run_%Y%m%d_%H%M%S"))
    for d in ("patches", "traces", "test_outputs"):
        (out / d).mkdir(parents=True, exist_ok=True)
    cfg = {"base_url": a.base_url, "model": a.model, "sampling": sub["sampling"], "extra_body": json.loads(a.extra_body)}

    results = []
    for task in load_tasks(a.task_ids):
        tid, snap = task["instance_id"], DATA / "snapshots" / f"{task['instance_id']}.tgz"
        print(f"== {tid}", flush=True)
        sb, trace, t0, reason = Sandbox(snap, Path(a.venv), prefix="agent"), [], time.time(), "n/a"
        ctx = Ctx(sb, budget)
        try:
            if a.agent == "gold":
                sb.apply_patch(task["patch"])
                ctx.submit_patch(); reason = "submitted"
            elif a.agent == "llm":
                reason = run_agent(task, ctx, sub["system"], cfg, trace)
            patch = ctx.patch or sb.extract_patch()
        except Exception:  # noqa: BLE001
            reason, patch = "harness_error", ""
            trace.append({"type": "harness_error", "tb": traceback.format_exc()})
        finally:
            sb.cleanup()
        agent_s = time.time() - t0
        v = verify(task, patch, snap, Path(a.venv), DATA / "reference") if patch.strip() else None
        cat = classify(reason, patch, v)
        (out / "patches" / f"{tid}.patch").write_text(patch)
        (out / "traces" / f"{tid}.json").write_text(json.dumps(trace, indent=1, default=str))
        (out / "test_outputs" / f"{tid}.log").write_text((v or {}).get("log", ""))
        asst = [t for t in trace if t["type"] == "assistant"]
        r = {"instance_id": tid, "repo": task["repo"], "category": cat, "resolved": cat == "RESOLVED", "end_reason": reason,
             "tool_calls": ctx.calls, "turns": len(asst), "agent_seconds": round(agent_s, 1),
             "max_prompt_tokens": max([t.get("prompt_tokens") or 0 for t in asst], default=0), "patch_chars": len(patch)}
        results.append(r)
        print(json.dumps(r), flush=True)
        with (out / "task_results.jsonl").open("a") as f:
            f.write(json.dumps(r) + "\n")
        n = len(results); k = sum(x["resolved"] for x in results)
        cats: dict[str, int] = {}
        for x in results:
            cats[x["category"]] = cats.get(x["category"], 0) + 1
        (out / "summary.json").write_text(json.dumps({"resolution_rate": k / n, "resolved": k, "total": n, "categories": cats,
                                                      "agent": a.agent, "model": a.model, "budget": budget.__dict__}, indent=1))
    print(f"\nresolved {sum(x['resolved'] for x in results)}/{len(results)} -> {out}")


if __name__ == "__main__":
    main()
