"""Builds kaggle/holdout_ab.ipynb from the files in this repository.

The notebook embeds the two senior-dev bundles, the swelite skill patch and the
report script, so it runs on Kaggle without cloning this repository and always
matches the commit it was built from. Rebuild after changing any of them:

    python3 kaggle/build_notebook.py
"""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "kaggle" / "holdout_ab.ipynb"
EMBED = [
    *sorted(p for p in (ROOT / "bundles").rglob("*") if p.is_file() and "__pycache__" not in p.parts),
    ROOT / "ab" / "swelite_official_skills.py",
    ROOT / "ab" / "report.py",
]
# gemma-swe-agent commit the harness, the holdout split and the v4.3 bundle come from.
HARNESS_REF = "46b3f66113bba1a6325ea3cc00b9c267e418dc44"


def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(keepends=True)}


def code(text):
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
            "source": text.strip("\n").splitlines(keepends=True)}


def build():
    commit = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
                            capture_output=True, text=True).stdout.strip() or "unknown"
    files = {str(p.relative_to(ROOT)): p.read_text(encoding="utf-8") for p in EMBED}

    cells = [
        md(f"""
# Holdout A/B: v4.3 vs the senior-dev ports

This notebook runs one or more arms of the holdout A/B on Kaggle's free T4 x2, using the real Gemma 4 31B. The three arms are:

| Arm | Bundle |
| --- | --- |
| `v43` (control) | the best public config (0.10 on the leaderboard) |
| `port` | `bundles/senior-dev-port` |
| `presubmit` | `bundles/senior-dev-presubmit` |

All three share tools, sampling settings (temperature 0.2, thinking off) and budget (4.5 min, 30 calls, 60 turns).

**Before you run:**
1. **Input:** add the competition data with *Add Input → Competitions → Gemma 4 Developer Agent*. Your account must have accepted the rules.
2. **Settings:** set *Accelerator* to **GPU T4 x2**, and turn *Internet* **on**. The notebook downloads llama.cpp, the model and the harness.
3. **Arms:** set `ARMS` in the next cell. One arm over 33 tasks takes about 3.5–4 hours, plus about 40 minutes of setup. Kaggle stops a session at 12 hours, so run **one or two arms per session**. For example, run `["v43", "port"]` in one session and `["presubmit"]` in another.
4. **Run:** use *Save Version → Save & Run All (Commit)*. It runs in the background, and the results land in the version's Output.

**Results:** each arm writes `ab-<arm>-r<repeat>.tgz` to `/kaggle/working`. To get the report, attach the earlier versions' outputs as inputs in a new session and run only the last cell (set `REPORT_ONLY = True`). It finds every `ab-*.tgz` under `/kaggle/input` and `/kaggle/working`.

**How this differs from the scorer:**
- **Serving:** the model runs as the official QAT Q4_0 GGUF on llama.cpp, not W4A16 on vLLM. vLLM can't run W4A16 on T4s. Every arm gets the same model and server, so the comparison is fair. Absolute scores will differ from the leaderboard: v4.3 scored 1/33 here against 0.10 on the leaderboard.
- **Sandboxes:** tasks run in swelite's subprocess sandbox, because there's no Docker on Kaggle.
- **Skills:** stock swelite runs skills differently from the scorer. The notebook patches that with `ab/swelite_official_skills.py`, so the `presubmit` arm calls its skill the way the scorer would.

Built from Gemma-4 commit `{commit}`; the harness is pinned to gemma-swe-agent `{HARNESS_REF[:7]}`.
"""),
        code("""
# ---- settings ----
ARMS = ["port"]          # any of "v43", "port", "presubmit"; one or two per session
REPEAT = 1               # label for this pass; use 2, 3, ... for later passes of the same arm
LIMIT = None             # e.g. 3 for a quick smoke test; None runs all 33 holdout tasks
SPLIT = "holdout"
SESSION_HOURS = 11.5     # stop starting new arms once an arm could not finish inside this
ARM_HOURS_ESTIMATE = 4.2 # per arm on 33 tasks, from earlier T4 x2 runs
REPORT_ONLY = False      # True: skip setup and runs, just build the report from attached results
"""),
        code(f"""
import json, os, pathlib, subprocess, sys, tarfile, threading, time, urllib.request
T0 = time.time()
W = pathlib.Path("/kaggle/working")
LOG = open(W / "run.log", "a", buffering=1)
HARNESS_REF = "{HARNESS_REF}"
HARNESS = W / "gemma-swe-agent"
BUNDLE_COMMIT = "{commit}"

def log(*a):
    s = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(s, flush=True); LOG.write(s + "\\n")

def sh(cmd, timeout=None, check=False):
    log("$", cmd[:200])
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    if r.stdout.strip(): log(r.stdout[-1500:])
    if r.stderr.strip(): log(r.stderr[-1500:])
    if check and r.returncode != 0:
        raise RuntimeError(f"command failed ({{r.returncode}}): {{cmd[:120]}}")
    return r

assert set(ARMS) <= {{"v43", "port", "presubmit"}}, ARMS
"""),
        code(f"""
# ---- files embedded from the Gemma-4 repository at commit {commit} ----
EMBEDDED = {json.dumps(files, indent=1, ensure_ascii=False)}
AB = W / "ab_files"
for rel, text in EMBEDDED.items():
    p = AB / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
log(f"wrote {{len(EMBEDDED)}} embedded files under {{AB}}")
"""),
        code("""
# ---- checks: data, GPU, disk ----
if not REPORT_ONLY:
    found = subprocess.run("find /kaggle/input -maxdepth 4 -name tasks.jsonl 2>/dev/null | head -1",
                           shell=True, capture_output=True, text=True).stdout.strip()
    assert found, "Competition data not found: add it via Add Input -> Competitions -> Gemma 4 Developer Agent"
    DATA = str(pathlib.Path(found).parent); log("DATA =", DATA)
    gpus = sh("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader").stdout
    assert "T4" in gpus or "L4" in gpus, "Set Accelerator to GPU T4 x2 in the notebook settings"
    sh("df -h /tmp /kaggle/working | tail -2; free -g | head -2")
"""),
        code("""
# ---- harness: gemma-swe-agent's swelite, pinned ----
if not REPORT_ONLY:
    if not HARNESS.exists():
        sh(f"git clone -q https://github.com/happyc0der/gemma-swe-agent.git {HARNESS}", check=True)
    sh(f"cd {HARNESS} && git fetch -q origin {HARNESS_REF} 2>/dev/null; git checkout -q {HARNESS_REF} && git log --oneline -1", check=True)
    sh(f"{sys.executable} -m pip install -q -e {HARNESS}/harness virtualenv 2>&1 | grep -viE 'warning|incompatible' | tail -2")
    sh(f"{sys.executable} -c 'import google.adk, swelite; print(\\"adk\\", google.adk.__version__)'", check=True)
    # The presubmit arm needs the scorer's skill behaviour; check the patch imports cleanly.
    sh(f"cd {AB}/ab && {sys.executable} -c 'import swelite_official_skills; print(\\"skill patch ok\\")'", check=True)
    SPLITS = json.load(open(HARNESS / "experiments" / "splits.json"))
    IDS = [i for i in SPLITS[SPLIT] if i not in SPLITS["env_unstable"]][: LIMIT or None]
    log(f"{SPLIT}: {len(IDS)} tasks")
    ARM_DIRS = {"v43": HARNESS / "experiments/variants/v43",
                "port": AB / "bundles/senior-dev-port",
                "presubmit": AB / "bundles/senior-dev-presubmit"}
    for arm in ARMS:
        assert (ARM_DIRS[arm] / "agent.yaml").exists(), ARM_DIRS[arm]
"""),
        code("""
# ---- llama.cpp server, built for T4 (sm_75) ----
if not REPORT_ONLY:
    sh("mkdir -p /tmp/cudalib && d=$(dirname $(find /usr/lib /usr/local -name 'libcuda.so.1' 2>/dev/null | head -1)) && ln -sf $d/libcuda.so.1 /tmp/cudalib/libcuda.so")
    if not pathlib.Path("/tmp/llama.cpp/build/bin/llama-server").exists():
        sh("cd /tmp && rm -rf llama.cpp && git clone -q --depth 1 https://github.com/ggml-org/llama.cpp", check=True)
        sh("cd /tmp/llama.cpp && cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=75 -DLLAMA_CURL=OFF "
           "-DCMAKE_LIBRARY_PATH='/tmp/cudalib;/usr/local/cuda/lib64/stubs' -DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc > /dev/null 2>&1; "
           "cmake --build build --config Release -j 4 --target llama-server 2>&1 | tail -1", timeout=3600)
    LLAMA_REF = sh("git -C /tmp/llama.cpp log --oneline -1").stdout.strip()
    assert pathlib.Path("/tmp/llama.cpp/build/bin/llama-server").exists(), "llama.cpp build failed; see run.log"
"""),
        code("""
# ---- weights: official QAT Q4_0 GGUF ----
if not REPORT_ONLY:
    os.environ["HF_HOME"] = "/tmp/hf"
    try:  # only needed if the repository is gated for your account
        from kaggle_secrets import UserSecretsClient
        os.environ["HF_TOKEN"] = UserSecretsClient().get_secret("HF_TOKEN")
        log("using HF_TOKEN from Kaggle secrets")
    except Exception:
        pass
    sh(f"{sys.executable} -m pip install -q huggingface_hub 2>&1 | tail -1")
    from huggingface_hub import hf_hub_download
    t = time.time()
    GGUF = hf_hub_download("google/gemma-4-31B-it-qat-q4_0-gguf", "gemma-4-31B_q4_0-it.gguf", local_dir="/tmp/gguf")
    log(f"gguf ready in {time.time() - t:.0f}s: {GGUF}")
"""),
        code("""
# ---- serve: one 32k slot (two overflow the T4s), no mmap (its page cache counts against
# Kaggle's 30 GB memory limit and got the server killed), restarted by a watchdog if it dies ----
SERVED = "gemma-4-31b-it-qat-w4a16-ct"
if not REPORT_ONLY:
    SERVER_CMD = ["stdbuf", "-oL", "-eL", "/tmp/llama.cpp/build/bin/llama-server", "-m", GGUF, "-ngl", "999", "-sm", "layer",
                  "-c", "32768", "-np", "1", "--jinja", "--host", "127.0.0.1", "--port", "8000", "--alias", SERVED,
                  "-fa", "on", "--reasoning-format", "auto", "--threads-http", "8"]

    def start_server(tag):
        srv = subprocess.Popen(SERVER_CMD, stdout=open(W / f"llama-{tag}.log", "a"), stderr=subprocess.STDOUT,
                               env={**os.environ, "LLAMA_ARG_MMAP": "0", "LLAMA_ARG_NO_MMAP": "1"})
        for i in range(80):
            time.sleep(15)
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/v1/models", timeout=5).read()
                log(f"llama-server up ({tag}) after {(i + 1) * 15}s"); return srv
            except Exception:
                if srv.poll() is not None:
                    log(f"llama-server died at startup ({tag}):", (W / f"llama-{tag}.log").read_text()[-1500:]); return None
        return None

    server = start_server("0")
    assert server is not None, "llama-server did not start; see llama-0.log"
    RESTARTS = 0

    def watchdog():
        global server, RESTARTS
        while True:
            time.sleep(20)
            if server.poll() is not None:
                RESTARTS += 1
                log(f"WATCHDOG: llama-server exited rc={server.returncode}; restart #{RESTARTS}")
                server = start_server(str(RESTARTS))
                if server is None:
                    log("WATCHDOG: restart failed"); return

    threading.Thread(target=watchdog, daemon=True).start()
"""),
        code("""
# ---- run the arms ----
# swelite runs with the skill patch imported, so run_skill_script behaves as on the scorer.
ENTRY = f"import sys; sys.path.insert(0, {str(AB / 'ab')!r}); import swelite_official_skills; from swelite.cli import app; app()"
if not REPORT_ONLY:
    (W / "results").mkdir(exist_ok=True)
    for arm in ARMS:
        hours_used = (time.time() - T0) / 3600
        need = ARM_HOURS_ESTIMATE * len(IDS) / 33
        if hours_used + need > SESSION_HOURS:
            log(f"SKIP {arm}: {hours_used:.1f} h used + ~{need:.1f} h needed > {SESSION_HOURS} h; run it in another session")
            continue
        name = f"{arm}-r{REPEAT}"
        out = W / "results" / name
        # Budgets come from each bundle's eval_config.yaml; nothing is overridden here.
        cmd = [sys.executable, "-c", ENTRY, "eval", "--data-dir", DATA, "--submission-dir", str(ARM_DIRS[arm]),
               "--results-dir", str(out), "--sandbox", "subprocess", "--concurrency", "1",
               "--api-base", "http://127.0.0.1:8000/v1", "--served-model", SERVED]
        for i in IDS:
            cmd += ["--task-id", i]
        log(f"START {name}: {len(IDS)} tasks")
        t = time.time()
        with open(W / f"{name}.console", "w") as console:
            rc = subprocess.run(cmd, cwd=HARNESS / "harness", stdout=console, stderr=subprocess.STDOUT).returncode
        log(f"END {name}: rc={rc} in {(time.time() - t) / 60:.0f} min; server restarts so far {RESTARTS}")
        (out / "run.json").write_text(json.dumps({"arm": arm, "repeat": REPEAT, "split": SPLIT, "tasks": len(IDS),
            "bundles_commit": BUNDLE_COMMIT, "harness_ref": HARNESS_REF, "llama_cpp": LLAMA_REF, "gguf": GGUF,
            "minutes": round((time.time() - t) / 60, 1), "server_restarts": RESTARTS}, indent=1))
        with tarfile.open(W / f"ab-{name}.tgz", "w:gz") as tar:
            tar.add(out, arcname=name, filter=lambda ti: None if "/test_outputs/" in ti.name else ti)
        rows = [json.loads(l) for l in (out / "task_results.jsonl").read_text().splitlines() if l.strip()] if (out / "task_results.jsonl").exists() else []
        log(f"RESULT {name}: {sum(bool(r.get('resolved')) for r in rows)}/{len(rows)} resolved -> ab-{name}.tgz")
    server.terminate()
    log(f"RUN_DONE after {(time.time() - T0) / 3600:.1f} h")
"""),
        code("""
# ---- report: every ab-*.tgz attached as input or produced in this session ----
import shutil
REPORT = W / "ab_report"
shutil.rmtree(REPORT, ignore_errors=True)
# One tarball per arm and repeat. Attached inputs come first, so a tarball made in this
# session replaces an attached one with the same name instead of mixing into it.
chosen = {}
for tgz in sorted(pathlib.Path("/kaggle/input").rglob("ab-*.tgz")) + sorted(W.glob("ab-*.tgz")):
    if tgz.name in chosen:
        log(f"WARNING: two copies of {tgz.name}; using {tgz}, ignoring {chosen[tgz.name]}")
    chosen[tgz.name] = tgz
for tgz in chosen.values():
    with tarfile.open(tgz) as tar:
        tar.extractall(REPORT)
arms_found = sorted(p.name for p in REPORT.iterdir() if p.is_dir()) if REPORT.exists() else []
log("results found:", arms_found or "none")
if arms_found:
    r = subprocess.run([sys.executable, str(AB / "ab" / "report.py"), str(REPORT)], capture_output=True, text=True)
    print(r.stdout or r.stderr)
    (W / "ab_report.txt").write_text(r.stdout or r.stderr)
"""),
    ]
    for i, cell in enumerate(cells):
        cell["id"] = f"cell-{i:02d}"
    nb = {"cells": cells, "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
        "kaggle": {"accelerator": "nvidiaTeslaT4", "isInternetEnabled": True, "isGpuEnabled": True},
    }, "nbformat": 4, "nbformat_minor": 5}
    OUT.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(cells)} cells, {len(files)} embedded files, commit {commit}")


if __name__ == "__main__":
    build()
