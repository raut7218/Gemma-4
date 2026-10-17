"""Shortlist ~500 balanced SWE-style tasks from nebius/SWE-rebench and nebius/SWE-bench-extra.

  uv run --with duckdb python scripts/select_external_tasks.py            # writes data-external/selected.jsonl etc.

The tasks stand in for the Gemma 4 Developer Agent competition's public repos (fastapi, rich, requests, httpx) without
containing any of them: the repos below are neighbours in the same three areas (web/validation, terminal/text, HTTP clients).
Only the Parquet columns of the wanted repos are read (HF datasets-server + DuckDB), not the whole 21k-row dataset.
Output: selected.jsonl (500), reserve.jsonl (ordered replacements) and selection_manifest.json (counts to check the balance).
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import urllib.request
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
HF = "https://datasets-server.huggingface.co"
SOURCES = [("nebius/SWE-rebench", "test"), ("nebius/SWE-bench-extra", "train")]

# domain -> repo -> weight (closer to the public repos = larger share)
DOMAINS: dict[str, dict[str, float]] = {
    "A": {"encode/starlette": 2, "sanic-org/sanic": 1.5, "agronholm/anyio": 1, "encode/uvicorn": 1, "Fatal1ty/mashumaro": 1,
          "marshmallow-code/apispec": 1, "marshmallow-code/marshmallow": 1, "mirumee/ariadne": 1, "falconry/falcon": 1,
          "python-trio/trio": 0.5, "pydantic/pydantic": 1},
    "B": {"Textualize/textual": 2, "omni-us/jsonargparse": 1, "zulip/zulip-terminal": 1, "sdispater/tomlkit": 1, "mkdocs/mkdocs": 1,
          "facelessuser/pymdown-extensions": 1, "twisted/towncrier": 1, "matthewwithanm/python-markdownify": 1,
          "hynek/structlog": 1, "Delgan/loguru": 1},
    "C": {"planetlabs/planet-client-python": 1.5, "burnash/gspread": 1, "getsentry/responses": 1.5, "jpadilla/pyjwt": 1,
          "aio-libs/yarl": 1, "ucfopen/canvasapi": 1, "urllib3/urllib3": 1, "docker/docker-py": 1},
}
SHARE = {"A": 0.42, "B": 0.33, "C": 0.25}
REPO_CAP_FRAC, REPO_CAP = 0.10, {"pydantic/pydantic": 25}
SAME_FILE_CAP = 8
EXCLUDED_EXACT = {"fastapi/fastapi", "Textualize/rich", "psf/requests", "encode/httpx", "encode/httpcore", "ewels/rich-click"}
EXCLUDED_STEM = re.compile(r"fastapi|httpx|(^|/)(rich|requests)$", re.I)  # forks and mirrors of the public repos
TEST_PATH = re.compile(r"(^|/)(tests?|testing)(/|_)|test_|_test\.py|conftest")
SIZE_BUCKETS = [("small", 10), ("medium", 25), ("large", 60)]
BUCKET_RATIO = {"small": 2, "medium": 2, "large": 1}  # public median is ~12 changed lines


def hf_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def jl(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except ValueError:
            return v
    return v


def src_stats(patch: str) -> tuple[list[str], int]:
    """Non-test .py files in the gold patch and the number of changed lines in them (docs, changelog, tests ignored)."""
    files = re.findall(r"^--- a/(\S+)", patch, re.M)
    src = [f for f in files if f.endswith(".py") and not TEST_PATH.search(f)]
    n, cur = 0, None
    for line in patch.splitlines():
        if line.startswith("--- a/"):
            cur = line[6:]
        elif cur in src and line[:1] in "+-" and line[:3] not in ("+++", "---"):
            n += 1
    return src, n


def bucket(n: int) -> str:
    return next(name for name, hi in SIZE_BUCKETS if n <= hi)


def shingles(text: str) -> set[str]:
    w = re.findall(r"\w+", text.lower())[:400]
    return {" ".join(w[i:i + 4]) for i in range(max(1, len(w) - 3))}


def load_candidates(kaggle: list[dict], stats: collections.Counter) -> list[dict]:
    repos = [r for d in DOMAINS.values() for r in d]
    dom = {r: d for d, rs in DOMAINS.items() for r in rs}
    kag = [shingles(t["problem_statement"]) for t in kaggle]
    con = duckdb.connect()
    con.execute("install httpfs; load httpfs;")
    seen_id, seen_text, out = set(), set(), []
    for ds, split in SOURCES:
        files = [f["url"] for f in hf_json(f"{HF}/parquet?dataset={ds}")["parquet_files"] if f["split"] == split]
        lst = ",".join(f"'{u}'" for u in files)
        rl = ",".join(f"'{r}'" for r in repos)
        extra = "install_config, license_name AS lic" if ds.endswith("rebench") else "NULL AS install_config, license AS lic"
        rows = con.execute(
            f"select instance_id, repo, base_commit, created_at, hints_text, patch, test_patch, problem_statement, "
            f"FAIL_TO_PASS, PASS_TO_PASS, {extra} from read_parquet([{lst}]) where repo in ({rl})").fetchall()
        cols = ["instance_id", "repo", "base_commit", "created_at", "hints_text", "patch", "test_patch", "problem_statement",
                "FAIL_TO_PASS", "PASS_TO_PASS", "install_config", "license"]
        for row in rows:
            r = dict(zip(cols, row))
            stats["raw"] += 1
            if r["repo"] in EXCLUDED_EXACT or EXCLUDED_STEM.search(r["repo"]):
                stats["excluded_repo"] += 1
                continue
            if r["instance_id"] in seen_id or r["problem_statement"][:300] in seen_text:
                stats["duplicate"] += 1
                continue
            seen_id.add(r["instance_id"])
            seen_text.add(r["problem_statement"][:300])
            src, n = src_stats(r["patch"])
            f2p = jl(r["FAIL_TO_PASS"])
            if not 1 <= len(src) <= 3 or n > 60:
                stats["patch_size"] += 1
                continue
            if len(r["problem_statement"]) < 150 or not f2p:
                stats["no_issue_text_or_f2p"] += 1
                continue
            ic = r["install_config"] or {}
            py = re.match(r"(\d+)\.(\d+)", str(ic.get("python") or ""))
            if py and (int(py[1]), int(py[2])) < (3, 7):
                stats["python_lt_3.7"] += 1
                continue
            year = int(str(r["created_at"])[:4])
            if year < 2019 or (year < 2021 and dom[r["repo"]] != "A"):
                stats["too_old"] += 1
                continue
            sh = shingles(r["problem_statement"])
            if any(len(sh & k) / max(1, len(sh | k)) > 0.8 for k in kag):
                stats["overlaps_kaggle_issue"] += 1
                continue
            iso = str(r["created_at"]).replace(" ", "T")
            r.update(created_at=iso if iso.endswith("Z") or "+" in iso else iso + "Z", FAIL_TO_PASS=f2p,
                     PASS_TO_PASS=jl(r["PASS_TO_PASS"]), domain=dom[r["repo"]], source_dataset=ds, src_files=src,
                     src_lines=n, size_bucket=bucket(n), year=year, python=ic.get("python"), install=ic.get("install"),
                     test_cmd=ic.get("test_cmd"), pip_packages=ic.get("pip_packages"), reqs_path=ic.get("reqs_path"), tier=1 if year >= 2021 else 2)
            r.pop("install_config")
            out.append(r)
    stats["eligible"] = len(out)
    return out


def order_repo(tasks: list[dict]) -> list[dict]:
    """Interleave size buckets (small:medium:large = 2:2:1), newest first inside each bucket."""
    by = {b: sorted((t for t in tasks if t["size_bucket"] == b), key=lambda t: t["created_at"], reverse=True) for b, _ in SIZE_BUCKETS}
    out, i = [], {b: 0 for b in by}
    while any(i[b] < len(by[b]) for b in by):
        for b, k in BUCKET_RATIO.items():
            for _ in range(k):
                if i[b] < len(by[b]):
                    out.append(by[b][i[b]])
                    i[b] += 1
    return out


def pick(pool: list[dict], total: int, taken: set[str], wanted: dict[str, int]) -> list[dict]:
    """Weighted round robin over repos, each repo walking its own ordered list. `wanted` is the per-domain target."""
    weight = {r: w for d in DOMAINS.values() for r, w in d.items()}
    dom = {r: d for d, rs in DOMAINS.items() for r, w in rs.items()}
    queues = {r: order_repo([t for t in pool if t["repo"] == r and t["instance_id"] not in taken]) for r in weight}
    cap = {r: min(REPO_CAP.get(r, int(total * REPO_CAP_FRAC) or 1), len(q)) for r, q in queues.items()}
    got: dict[str, list[dict]] = {r: [] for r in weight}
    files: collections.Counter = collections.Counter()
    done = collections.Counter()

    def step(domain: str, tiers: tuple[int, ...]) -> bool:
        open_ = [r for r in weight if dom[r] == domain and len(got[r]) < cap[r] and queues[r]]
        for r in sorted(open_, key=lambda r: len(got[r]) / weight[r]):
            queues[r] = [t for t in queues[r] if not any(files[(r, f)] >= SAME_FILE_CAP for f in t["src_files"])]
            for i, t in enumerate(queues[r]):
                if t["tier"] not in tiers:
                    continue
                queues[r].pop(i)
                got[r].append(t)
                done[domain] += 1
                for f in t["src_files"]:
                    files[(r, f)] += 1
                return True
        return False

    for tiers in ((1,), (1, 2)):  # older tasks only once the 2021+ pool of the domain is used up
        for d in wanted:
            while done[d] < wanted[d] and step(d, tiers):
                pass
    left = sum(wanted.values()) - sum(done.values())  # rollover of a domain's shortfall to domains with capacity
    while left > 0:
        d = min((d for d in wanted if any(len(got[r]) < cap[r] and queues[r] for r in weight if dom[r] == d)),
                key=lambda d: done[d] / wanted[d], default=None)
        if d is None or not step(d, (1, 2)):
            break
        left -= 1
    return [t for r in weight for t in got[r]]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "data-external"))
    ap.add_argument("--kaggle-tasks", default=str(ROOT / "data" / "tasks.jsonl"))
    ap.add_argument("--n", type=int, default=500)
    ap.add_argument("--reserve", type=int, default=60)
    ap.add_argument("--ids", default=None, help="file from a finished run (selected ids, then reserve ids, one per line): "
                    "rebuild exactly that selection, without the Kaggle overlap check or the quotas")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    stats: collections.Counter = collections.Counter()
    if a.ids:
        wanted = [l.split() for l in open(a.ids) if l.strip()]
        pool = load_candidates([], stats)
        by_id = {t["instance_id"]: t for t in pool}
        missing = [w[0] for w in wanted if w[0] not in by_id]
        assert not missing, f"ids not in the candidate pool: {missing[:5]} ({len(missing)})"
        sel = [by_id[w[0]] for w in wanted if w[1] == "selected"]
        res = [by_id[w[0]] for w in wanted if w[1] == "reserve"]
    else:
        kaggle = [json.loads(l) for l in open(a.kaggle_tasks)]
        pool = load_candidates(kaggle, stats)
        sel = pick(pool, a.n, set(), {d: round(a.n * s) for d, s in SHARE.items()})
        taken = {t["instance_id"] for t in sel}
        res = pick(pool, a.n, taken, {d: round(a.reserve * s) for d, s in SHARE.items()})
    for name, rows in (("selected", sel), ("reserve", res)):
        with open(out / f"{name}.jsonl", "w") as f:
            for t in rows:
                f.write(json.dumps(t) + "\n")
    c = lambda rows, k: dict(sorted(collections.Counter(t[k] for t in rows).items()))  # noqa: E731
    man = {"funnel": dict(stats), "selected": len(sel), "reserve": len(res), "by_domain": c(sel, "domain"), "by_repo": c(sel, "repo"),
           "by_year": c(sel, "year"), "by_size_bucket": c(sel, "size_bucket"), "by_source": c(sel, "source_dataset"),
           "reserve_by_domain": c(res, "domain"), "kaggle_public_repos_excluded": sorted(EXCLUDED_EXACT)}
    (out / "selection_manifest.json").write_text(json.dumps(man, indent=2))
    print(json.dumps(man, indent=2))


if __name__ == "__main__":
    main()
