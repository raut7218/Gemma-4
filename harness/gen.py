"""Trajectory generator: runs many tasks in parallel against one vLLM server and keeps every conversation.

  python -m harness.gen --validate --data data-external --venv-root $VENVS --workers 2          # gold + baseline check, no LLM
  python -m harness.gen --data data-external --venv-root $VENVS --base-url http://127.0.0.1:8000/v1 \
      --model gemma-4-31b-it --workers 20 --epochs 2 --deadline-min 105 --sync-dir /content/drive/MyDrive/gemma4/results/run1

--validate writes <data>/validation.jsonl: a task is usable when the gold patch passes some tests and at least one of those
tests fails without it (so a wrong patch cannot "resolve" by accident). A generation run uses only usable tasks, runs them in
an order where every prefix is balanced across repos, and gives an unresolved task a second attempt when --epochs 2.
Everything is resumable: results land in --results-dir (default results/gen) and are copied to --sync-dir every --sync-every s.
"""
from __future__ import annotations

import argparse
import collections
import json
import random
import shutil
import threading
import time
import urllib.request
from pathlib import Path

from .bundle import load_submission
from .run import ROOT, run_task, venv_for
from .tools import SCHEMAS, Budget
from .verify import _verify

COMPACTION_TOKENS = 14336  # the scorer's ADK compaction starts here; the harness does not reproduce it


def load_tasks(data: Path) -> list[dict]:
    have = {p.stem for p in (data / "snapshots").glob("*.tgz")}
    return [t for t in map(json.loads, (data / "tasks.jsonl").open()) if t["instance_id"] in have]


def balanced_order(tasks: list[dict], seed: int) -> list[dict]:
    """Proportional interleave: the i-th of n tasks of a repo sorts at (i + 0.5) / n, so any prefix keeps the repo mix."""
    rng, by = random.Random(seed), collections.defaultdict(list)
    for t in tasks:
        by[t["repo"]].append(t)
    keyed = []
    for rows in by.values():
        rng.shuffle(rows)
        keyed += [((i + 0.5) / len(rows), rng.random(), t) for i, t in enumerate(rows)]
    return [t for _, _, t in sorted(keyed, key=lambda x: x[:2])]


# -- validation ---------------------------------------------------------------------------------------
def validate_task(task: dict, data: Path, venv: Path) -> dict:
    t0, snap, tid = time.time(), data / "snapshots" / f"{task['instance_id']}.tgz", task["instance_id"]
    row = {"instance_id": tid, "repo": task["repo"], "ok": False, "reason": "", "required": 0, "f2p": 0}
    try:
        gold = _verify(task, task["patch"], snap, venv)
        req = set(gold.get("passed_ids") or [])
        if gold.get("error") in ("PATCH_REJECTED", "TEST_PATCH_FAILED", "NO_JUNIT"):
            row["reason"] = gold["error"] + ": " + (gold.get("log") or "")[-300:].replace("\n", " | ")
        elif not req:
            row["reason"] = "no_gold_pass: " + (gold.get("log") or "")[-300:].replace("\n", " | ")
        else:
            base = set(_verify(task, "", snap, venv).get("passed_ids") or [])
            row.update(required=len(req), f2p=len(req - base))
            if req - base:
                row["ok"] = True
                (data / "reference").mkdir(exist_ok=True)
                (data / "reference" / f"{tid}.json").write_text(json.dumps(sorted(req)))
            else:
                row["reason"] = "not_discriminating"
    except Exception as e:  # noqa: BLE001
        row["reason"] = f"harness_error: {e!r}"[:300]
    row["seconds"] = round(time.time() - t0, 1)
    return row


def read_jsonl(f: Path) -> list[dict]:
    return [json.loads(l) for l in f.open()] if f.exists() else []


# -- scheduling ---------------------------------------------------------------------------------------
class Scheduler:
    """Hands out (task, attempt). Epoch 1 walks the balanced order; later attempts go to tasks whose earlier attempts all failed."""

    def __init__(self, tasks: list[dict], prior: list[dict], epochs: int, deadline: float, limit: int | None):
        self.tasks, self.epochs, self.deadline, self.limit = tasks, epochs, deadline, limit
        self.lock = threading.Lock()
        self.tries = collections.Counter(r["instance_id"] for r in prior)
        self.won = {r["instance_id"] for r in prior if r["resolved"]}
        self.running: set[str] = set()
        self.launched = 0

    def next(self):
        """A job, "WAIT" (nothing runnable yet) or None (done)."""
        with self.lock:
            if time.time() >= self.deadline or (self.limit is not None and self.launched >= self.limit):
                return None
            for want_retry in (False, True):
                for t in self.tasks:
                    tid = t["instance_id"]
                    n = self.tries[tid]
                    if tid in self.running or tid in self.won or n >= self.epochs or (n > 0) != want_retry:
                        continue
                    self.running.add(tid)
                    self.launched += 1
                    return t, n + 1
            return "WAIT" if self.running else None

    def done(self, tid: str, resolved: bool, counted: bool = True):
        with self.lock:
            self.running.discard(tid)
            if counted:
                self.tries[tid] += 1
            if resolved:
                self.won.add(tid)


def server_up(base_url: str) -> bool:
    try:
        with urllib.request.urlopen(base_url.rstrip("/") + "/models", timeout=10) as r:
            return r.status == 200
    except Exception:  # noqa: BLE001
        return False


def sync(src: Path, dst: Path, seen: dict[str, float]):
    """Copies files that are new or changed since the last pass (Drive is slow with many small files, so only deltas)."""
    for f in src.rglob("*"):
        if f.is_file():
            m = f.stat().st_mtime
            if seen.get(str(f)) != m:
                (dst / f.relative_to(src)).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dst / f.relative_to(src))
                seen[str(f)] = m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data-external"))
    ap.add_argument("--agent", choices=["llm", "gold", "noop"], default="llm")
    ap.add_argument("--submission", default=str(ROOT / "submission"))
    ap.add_argument("--base-url", default="http://127.0.0.1:8000/v1")
    ap.add_argument("--model", default="gemma-4-31b-it")
    ap.add_argument("--extra-body", default="{}")
    ap.add_argument("--venv", default=str(ROOT / ".venv-sandbox"))
    ap.add_argument("--venv-root", default=None)
    ap.add_argument("--results-dir", default=str(ROOT / "results" / "gen"))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--epochs", type=int, default=1, help="attempts per task; a task is retried only while unresolved")
    ap.add_argument("--limit", type=int, default=None, help="stop after launching this many attempts")
    ap.add_argument("--ids-file", default=None, help="only these instance ids (one per line)")
    ap.add_argument("--deadline-min", type=float, default=None, help="launch no new attempt after this many minutes")
    ap.add_argument("--sync-dir", default=None)
    ap.add_argument("--sync-every", type=float, default=180)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--validate", action="store_true", help="check tasks with the gold patch instead of generating")
    a = ap.parse_args()
    data, out, t_start = Path(a.data), Path(a.results_dir), time.time()
    venv_root = Path(a.venv_root) if a.venv_root else None
    tasks = load_tasks(data)
    if a.ids_file:
        keep = set(Path(a.ids_file).read_text().split())
        tasks = [t for t in tasks if t["instance_id"] in keep]
    tasks = balanced_order(tasks, a.seed)

    if a.validate:
        vf = data / "validation.jsonl"
        done = {r["instance_id"] for r in read_jsonl(vf)}
        todo, lock = [t for t in tasks if t["instance_id"] not in done], threading.Lock()

        def vworker():
            while True:
                with lock:
                    if not todo:
                        return
                    t = todo.pop(0)
                row = validate_task(t, data, venv_for(t, Path(a.venv), venv_root))
                with lock, vf.open("a") as f:
                    f.write(json.dumps(row) + "\n")
                print(f"{'ok ' if row['ok'] else 'BAD'} {t['instance_id']:50} req={row['required']:4} f2p={row['f2p']:3} {row['seconds']:6.1f}s {row['reason'][:90]}", flush=True)

        ths = [threading.Thread(target=vworker) for _ in range(a.workers)]
        [th.start() for th in ths]
        [th.join() for th in ths]
        rows = read_jsonl(vf)
        print(f"usable {sum(r['ok'] for r in rows)}/{len(rows)}")
        return

    # only validated tasks: unknown ones are validated by the worker first (CPU only, no LLM time spent)
    status = {r["instance_id"]: r for r in read_jsonl(data / "validation.jsonl")}
    tasks = [t for t in tasks if status.get(t["instance_id"], {"ok": True})["ok"]]
    sub = load_submission(Path(a.submission))
    budget = Budget(**{k: v for k, v in sub["eval"].items() if k in Budget.__dataclass_fields__})
    cfg = {"base_url": a.base_url, "model": a.model, "sampling": sub["sampling"], "extra_body": json.loads(a.extra_body)}
    allowed = sub["root"].get("tools") or []
    tools = [s for s in SCHEMAS if s["function"]["name"] in allowed]
    for d in ("patches", "traces", "test_outputs", "trajectories"):
        (out / d).mkdir(parents=True, exist_ok=True)
    rf = out / "task_results.jsonl"
    prior = read_jsonl(rf)
    sched = Scheduler(tasks, prior, a.epochs, t_start + 60 * a.deadline_min if a.deadline_min else float("inf"), a.limit)
    results, lock, seen = list(prior), threading.Lock(), {}
    llm_errors = [0]
    stop = threading.Event()
    print(f"{len(tasks)} usable tasks, {len(prior)} earlier attempts, {a.workers} workers, model {a.model}, "
          f"temperature {sub['sampling'].get('temperature')}", flush=True)

    def write_summary():
        by = collections.defaultdict(lambda: [0, 0])
        for r in results:
            by[r["repo"]][0] += 1
            by[r["repo"]][1] += r["resolved"]
        cats = collections.Counter(r["category"] for r in results)
        el = max(1.0, time.time() - t_start)
        toks = sum(r.get("completion_tokens") or 0 for r in results)
        (out / "summary.json").write_text(json.dumps({
            "attempts": len(results), "resolved": sum(r["resolved"] for r in results),
            "distinct_resolved": len({r["instance_id"] for r in results if r["resolved"]}), "categories": dict(cats),
            "by_repo": {k: {"attempts": v[0], "resolved": v[1]} for k, v in sorted(by.items())},
            "elapsed_min": round(el / 60, 1), "completion_tokens": toks, "model": a.model, "budget": budget.__dict__,
            "sampling": sub["sampling"]}, indent=1))

    def worker():
        while not stop.is_set():
            job = sched.next()
            if job is None:
                return
            if job == "WAIT":
                time.sleep(5)
                continue
            task, k = job
            tid = task["instance_id"]
            venv = venv_for(task, Path(a.venv), venv_root)
            if tid not in status and a.agent == "llm":  # gold-first: no LLM time on a task that cannot be graded
                row = validate_task(task, data, venv)
                with lock, (data / "validation.jsonl").open("a") as f:
                    f.write(json.dumps(row) + "\n")
                status[tid] = row
                if not row["ok"]:
                    print(f"skip {tid}: {row['reason'][:100]}", flush=True)
                    sched.done(tid, False, counted=False)
                    sched.tries[tid] = a.epochs
                    continue
            name = f"{tid}__a{k}"
            r, msgs = run_task(task, agent=a.agent, sub=sub, budget=budget, cfg=cfg, venv=venv, data=data, out=out, name=name)
            if r["end_reason"] == "llm_error" and r["tool_calls"] == 0:  # server trouble, not a task result
                llm_errors[0] += 1
                sched.done(tid, False, counted=False)
                if llm_errors[0] >= 6 and not server_up(a.base_url):
                    print("LLM server is down; stopping", flush=True)
                    stop.set()
                time.sleep(20)
                continue
            llm_errors[0] = 0
            r.update(attempt=k, domain=task.get("domain"), over_compaction=r["max_prompt_tokens"] > COMPACTION_TOKENS,
                     submit_calls=sum(1 for m in msgs for c in (m.get("tool_calls") or []) if c["function"]["name"] == "submit_patch"),
                     tok_per_s=round((r.get("completion_tokens") or 0) / max(1.0, r["agent_seconds"]), 1))
            (out / "trajectories" / f"{name}.json").write_text(json.dumps(
                {"instance_id": tid, "attempt": k, "meta": r, "tools": tools, "messages": msgs}, default=str))
            with lock:
                results.append(r)
                with rf.open("a") as f:
                    f.write(json.dumps(r) + "\n")
                write_summary()
                n, ok = len(results), sum(x["resolved"] for x in results)
            sched.done(tid, r["resolved"])
            print(f"[{(time.time() - t_start) / 60:6.1f}m] {r['category']:16} {name:55} calls={r['tool_calls']:2} "
                  f"turns={r['turns']:2} ctx={r['max_prompt_tokens']:5} {r['agent_seconds']:5.0f}s {r['tok_per_s']:5.1f}tok/s | "
                  f"{ok}/{n} resolved", flush=True)

    def syncer():
        while not stop.wait(a.sync_every):
            try:
                sync(out, Path(a.sync_dir), seen)
            except Exception as e:  # noqa: BLE001
                print("sync failed:", e, flush=True)

    if a.sync_dir:
        Path(a.sync_dir).mkdir(parents=True, exist_ok=True)
        threading.Thread(target=syncer, daemon=True).start()
    ths = [threading.Thread(target=worker) for _ in range(a.workers)]
    [th.start() for th in ths]
    try:
        [th.join() for th in ths]
    except KeyboardInterrupt:
        stop.set()
        print("interrupted; finishing running attempts", flush=True)
        [th.join() for th in ths]
    stop.set()
    write_summary()
    if a.sync_dir:
        sync(out, Path(a.sync_dir), seen)
    print(f"done: {sum(r['resolved'] for r in results)}/{len(results)} attempts resolved -> {out}", flush=True)


if __name__ == "__main__":
    main()
