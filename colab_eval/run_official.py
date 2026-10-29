"""Runs a submission bundle through the official swegemma scorer without Docker (Colab, Kaggle notebooks, any Linux box).

`swegemma eval` alone is not what Kaggle runs: the scorer's scripts/inference.py (not shipped in the wheel) also reads the
bundle's eval_config.yaml and switches on ADK event compaction and context caching, and its Docker sandbox has a fixed
set of test packages. This wrapper reproduces those parts around the unmodified swegemma 0.2.11 / adk_submission 0.2.13:

  * EvalConfig from <bundle>/eval_config.yaml (inference.py defaults: 100 tool calls, 60 min, 500 turns, 300 s commands),
    plus EventsCompactionConfig(15, 2, 14336, 5) and ContextCacheConfig(2048, 1800, 10) as in HARNESS_README section 7.2.
  * `--sandbox subprocess`, patched to behave like the swebench-sandbox image:
      - every per-task venv sees only the sandbox site (built by build_sandbox_env.py: the Dockerfile's pip installs plus
        the newest py3.13 wheel of every package in the competition wheels dir, which is what Docker mode unpacks), never
        the harness's own packages; tasks of other repos (data-external) can get their own environment through
        --sandbox-site-map, and their per-task venv is then made by that environment's interpreter;
      - the scorer's sandbox/setup.py --fast-path runs per task (subprocess mode skips it), then sandbox_deps.py, which
        adds the other task repos' wheels and the wheel versions the task's own pyproject.toml requires (--no-deps skips
        it for environments that carry their own dependencies);
      - git identity and init.defaultBranch from a private gitconfig (the image sets them globally);
      - commands run in a private network namespace (`unshare -n -r`), as Docker's network_mode="none" does.
  * --max-time-minutes overrides only the time budget (and the "Time allowance" the prompt shows).
  * --l4-clock DECODE,PREFILL[,M[,LORA]] runs the time budget on a modelled 4x L4 clock instead of the G4's wall clock:
    real time minus real LLM time plus each call re-priced as M * (new prefill / PREFILL + LORA * completion / DECODE)
    (colab_eval.timing.call_cost). Tasks then stop where the scorer would stop them, whatever the G4's load, and the
    prompt shows the bundle's real cap. The wall-clock limit becomes --real-time-minutes.
  * --agent gold submits the reference patch (environment check), --agent noop an empty one.
  * --phase agent skips verification (the patch is saved and the row marked UNGRADED); --phase grade verifies saved
    patches later, e.g. on a CPU runtime.
  * every LLM call is appended to <results>/llm_calls.jsonl (task, latency, prompt/completion/reasoning tokens). With
    --log-requests a local proxy in front of the inference server also asks vLLM for token ids (return_token_ids) and
    writes every request and response, with the exact prompt and completion token ids, to
    <results>/requests/<worker>.jsonl.gz (training data); litellm still gets the plain response.
  * --queue DIR makes this process a worker of a shared queue (colab_eval.taskqueue): it claims one (arm, task) item at a
    time, longest expected first, until the queue is empty or --deadline passes. Arms (bundle, data, results, budget,
    clock) come from DIR/arms.json, so several bundles and datasets share one vLLM server without a slow tail.

  python -m colab_eval.run_official --bundle submission --data /content/comp --results-dir /content/results/v8 \
      --sandbox-site /content/sbx --concurrency 16 --max-time-minutes 30
  python -m colab_eval.run_official --queue /content/queue --worker 7 --deadline +240
"""

from __future__ import annotations

import argparse
import asyncio
import contextvars
import dataclasses
import gzip
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from colab_eval.timing import call_cost  # noqa: E402

# inference.py defaults (HARNESS_README section 7.1)
DEFAULTS = {'max_tool_calls': 100, 'max_time_minutes': 60.0, 'max_turns': 500, 'timeout_seconds': 300}
UNGRADED = 'UNGRADED: agent phase only (run --phase grade)'
# A new namespace starts with lo down; Docker's network_mode="none" keeps loopback (pytest-httpbin's local server).
# requests' connect-timeout tests dial the unroutable 10.255.255.1 and expect a timeout, which only a network that drops
# the packets gives (no network at all fails them at once with ENETUNREACH), so that /24 goes to a dummy device.
NETNS_PRELUDE = ('ip link set lo up 2>/dev/null; ip link add _bh type dummy 2>/dev/null && ip link set _bh up '
                 '&& ip route add 10.255.255.0/24 dev _bh 2>/dev/null\n')
DEPS_SCRIPT = Path(__file__).with_name('sandbox_deps.py')
ERA_PINS = Path(__file__).with_name('era_pins.json')
GITCONFIG = '[user]\n\temail = agent@eval\n\tname = Agent\n[init]\n\tdefaultBranch = main\n[safe]\n\tdirectory = *\n'
HARNESS_PY = f'{sys.version_info.major}.{sys.version_info.minor}'


@dataclasses.dataclass
class Arm:
    """One bundle on one dataset, written to one results dir (a queue holds several)."""
    name: str
    bundle: Path
    data: Path
    results: Path
    sandbox_site: Path
    site_map: dict = dataclasses.field(default_factory=dict)  # repo -> environment with that repo's dependencies
    deps: bool = True  # run sandbox_deps.py (competition repos); off for environments that carry their own deps
    setup_py: Path | None = None  # the scorer's sandbox/setup.py; default <data>/sandbox/setup.py
    wheels: Path | None = None  # copied to /wheels in each sandbox; default <data>/wheels
    tasks_file: Path | None = None  # default <data>/tasks.jsonl
    max_time_minutes: float | None = None
    l4_clock: str | None = None  # "decode,prefill[,m[,lora]]"
    real_time_minutes: float | None = None
    log_requests: bool = False
    agent: str = 'llm'
    compaction: bool = True

    @classmethod
    def from_json(cls, d: dict) -> 'Arm':
        d = dict(d)
        for k in ('bundle', 'data', 'results', 'sandbox_site', 'setup_py', 'wheels', 'tasks_file'):
            if d.get(k):
                d[k] = Path(d[k])
        d['site_map'] = {r: Path(p) for r, p in (d.get('site_map') or {}).items()}
        return cls(**{k: v for k, v in d.items() if k in {f.name for f in dataclasses.fields(cls)}})


@dataclasses.dataclass
class TaskEnv:
    site: Path
    python: Path
    version: str
    site_dirs: list
    deps: bool
    setup_py: Path
    wheels: Path


@dataclasses.dataclass
class Clock:
    """Per-task modelled 4x L4 time of the LLM calls (see module docstring)."""
    decode: float
    prefill: float
    m: float = 1.0
    lora: float = 1.0
    real_llm: float = 0.0
    l4_llm: float = 0.0
    prev_prompt: int = 0
    calls: int = 0

    def add(self, latency: float, prompt: int | None, completion: int | None) -> None:
        p, c = prompt or 0, completion or 0
        self.real_llm += latency
        self.l4_llm += self.m * call_cost(self.prev_prompt, p, int(c * self.lora), self.decode, self.prefill)
        self.prev_prompt = p
        self.calls += 1


@dataclasses.dataclass
class RunCtx:
    arm: Arm
    task: str
    env: TaskEnv
    worker: str
    clock: Clock | None = None
    task_text: str = ''  # start of the problem statement, to tell concurrent tasks' requests apart


CURRENT: contextvars.ContextVar[RunCtx | None] = contextvars.ContextVar('colab_eval_run', default=None)
ACTIVE: dict[str, RunCtx] = {}  # tasks running in this process, for the request-log proxy (a thread sees no contextvars)
_ENVS: dict = {}


def load_budget(bundle: Path) -> dict:
    """The bundle's evaluation: block over inference.py's defaults."""
    budget = dict(DEFAULTS)
    cfg = bundle / 'eval_config.yaml'
    if cfg.exists():
        ev = (yaml.safe_load(cfg.read_text()) or {}).get('evaluation') or {}
        budget.update({k: ev[k] for k in DEFAULTS if ev.get(k) is not None})
    return budget


def parse_clock(spec: str | None) -> tuple | None:
    if not spec:
        return None
    v = [float(x) for x in spec.split(',')]
    return (v[0], v[1], v[2] if len(v) > 2 else 1.0, v[3] if len(v) > 3 else 1.0)


def netns_works() -> bool:
    try:
        return subprocess.run(['unshare', '-n', '-r', 'true'], capture_output=True, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def task_env(arm: Arm, repo: str) -> TaskEnv:
    """The environment a task's sandbox sees: the repo's own (site_map) or the arm's sandbox site."""
    site = Path(arm.site_map.get(repo) or arm.sandbox_site).resolve()
    key = (str(site), arm.deps, str(arm.setup_py), str(arm.wheels), str(arm.data))
    if key in _ENVS:
        return _ENVS[key]
    site_dirs = sorted(str(p) for p in site.glob('lib/python3*/site-packages'))
    if not site_dirs:
        raise SystemExit(f'{site} has no lib/python3*/site-packages; build it first (build_sandbox_env.py)')
    python = site / 'bin' / 'python3'
    version = site_dirs[0].split('/lib/python')[1].split('/')[0]
    env = TaskEnv(site=site, python=python, version=version, site_dirs=site_dirs, deps=arm.deps,
                  setup_py=(arm.setup_py or arm.data / 'sandbox' / 'setup.py').resolve(),
                  wheels=(arm.wheels or arm.data / 'wheels').resolve())
    _ENVS[key] = env
    return env


def patch_subprocess_sandbox(default_env: TaskEnv | None, gitconfig: Path, netns: bool) -> None:
    """Makes swegemma's SubprocessManager behave like the Docker image (see module docstring). The environment of the
    task being run comes from CURRENT (set per task), so one process can serve tasks of different repos and arms."""
    import swegemma.harness.container_setup as cs
    import swegemma.sandbox.subprocess as sp

    def env_now() -> TaskEnv:
        ctx = CURRENT.get()
        env = ctx.env if ctx else default_env
        if env is None:
            raise RuntimeError('no sandbox environment for this task')
        return env

    orig_start = sp.SubprocessManager.start

    def start(self) -> str:
        sid = orig_start(self)
        env = env_now()
        venv_dir = self._sandboxes[sid]['venv']
        if env.version != HARNESS_PY:
            # venv.create() used the harness's interpreter; a repo environment on another Python needs its own
            subprocess.run([str(env.python), '-m', 'venv', '--without-pip', '--clear', str(venv_dir)],
                           check=True, capture_output=True, timeout=120)
        cfg = venv_dir / 'pyvenv.cfg'
        cfg.write_text(cfg.read_text().replace('include-system-site-packages = true', 'include-system-site-packages = false'))
        for d in venv_dir.glob('lib/python*/site-packages'):
            (d / '_host_env.pth').write_text('\n'.join(env.site_dirs) + '\n')
        return sid

    sp.SubprocessManager.start = start

    orig_env = sp.build_sanitized_env

    def build_env(*a, **kw):
        env = orig_env(*a, **kw)
        env['GIT_CONFIG_GLOBAL'] = str(gitconfig)
        # swegemma rewrites /workspace inside commands, not inside Python, so skill scripts that open the absolute
        # /workspace (as they must in the scorer's container) get the real path from SWE_WORKSPACE
        env['SWE_WORKSPACE'] = str(kw.get('work_dir') or a[0])
        env['PATH'] = env['PATH'].replace(str(Path(sys.executable).parent), str(env_now().python.parent))
        return env

    sp.build_sanitized_env = build_env

    if netns:
        orig_exec = sp.execute_subprocess_command

        def exec_cmd(command, *a, **kw):
            if isinstance(command, list) and command[:2] == ['/bin/bash', '-c']:
                command = ['unshare', '-n', '-r', '/bin/bash', '-c', NETNS_PRELUDE + command[2]]
            return orig_exec(command, *a, **kw)

        sp.execute_subprocess_command = exec_cmd

    def install_test_dependencies(docker, container_id, repo='', *, fast_path=True, config=None):
        env = env_now()
        docker.copy_to(container_id, env.setup_py, '/tmp/setup.py')
        res = docker.exec(container_id, f'python3 /tmp/setup.py {"--fast-path" if fast_path else ""} {repo}'.strip())
        if res.exit_code != 0:
            print(f'[warn] sandbox setup.py failed for {repo}: {res.stderr[-500:]}', file=sys.stderr)
        if env.deps:
            docker.copy_to(container_id, DEPS_SCRIPT, '/tmp/sandbox_deps.py')
            docker.copy_to(container_id, ERA_PINS, '/tmp/era_pins.json')
            res = docker.exec(container_id, f'python3 /tmp/sandbox_deps.py {repo} {env.wheels} /workspace')
            if 'installed' in res.stdout and os.environ.get('SWEGEMMA_COLAB_VERBOSE'):
                print(f'[deps] {repo}: {res.stdout.strip()[-300:]}', file=sys.stderr)
        docker.exec(container_id, 'rm -f /tmp/setup.py /tmp/sandbox_deps.py /tmp/era_pins.json')

    cs.install_test_dependencies = install_test_dependencies
    import swegemma.evaluate as ev
    ev.install_test_dependencies = install_test_dependencies
    for mod in list(sys.modules.values()):
        if getattr(mod, '__name__', '').startswith('swegemma.harness') and hasattr(mod, 'install_test_dependencies'):
            mod.install_test_dependencies = install_test_dependencies


def install_l4_clock() -> None:
    """Runs swegemma's time budget on the task's modelled L4 clock when the task has one (RunCtx.clock).

    Every budget check (check_budget, the loop's session timeout, get_status, command timeouts) reads
    SwegemmaContext.agent_elapsed_seconds; the one wall-clock guard, asyncio.timeout(budget) in agent_runner, gets the
    arm's real-time limit instead."""
    import swegemma.harness.agent_runner as ar
    from swegemma.context import SwegemmaContext

    real = SwegemmaContext.agent_elapsed_seconds

    def elapsed(self) -> float:
        wall = real.fget(self)
        ctx = CURRENT.get()
        if ctx is None or ctx.clock is None:
            return wall
        return max(0.0, wall - ctx.clock.real_llm + ctx.clock.l4_llm)

    SwegemmaContext.agent_elapsed_seconds = property(elapsed)

    class _Asyncio:
        def __getattr__(self, name):
            return getattr(asyncio, name)

        @staticmethod
        def timeout(delay):
            ctx = CURRENT.get()
            if delay is not None and ctx is not None and ctx.clock is not None:
                delay = 60.0 * (ctx.arm.real_time_minutes or 30.0)
            return asyncio.timeout(delay)

    ar.asyncio = _Asyncio()


class RequestLog:
    """Local HTTP proxy in front of the inference server for --log-requests. For tasks whose arm logs requests it adds
    return_token_ids to each chat completion, writes the request and the full response (with vLLM's prompt_token_ids
    and choices[].token_ids) to <results>/requests/<worker>.jsonl.gz, and strips those two fields again, so litellm
    parses exactly what it would get from vLLM directly."""

    def __init__(self, upstream: str, worker: str):
        self.upstream = upstream.rstrip('/')
        self.worker = worker
        self.lock = threading.Lock()

    def owner(self, body: dict) -> RunCtx | None:
        runs = list(ACTIVE.values())
        if len(runs) <= 1:
            return runs[0] if runs else None
        first_user = next((m.get('content') for m in body.get('messages', []) if m.get('role') == 'user'), '')
        text = first_user if isinstance(first_user, str) else json.dumps(first_user)
        return next((r for r in runs if r.task_text and r.task_text in text), None)

    def start(self) -> str:
        log = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, code: int, data: bytes, ctype: str = 'application/json'):
                self.send_response(code)
                self.send_header('Content-Type', ctype)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                try:
                    with urllib.request.urlopen(log.upstream + self.path.removeprefix('/v1'), timeout=60) as r:
                        self._send(r.status, r.read(), r.headers.get('Content-Type', 'application/json'))
                except urllib.error.HTTPError as e:
                    self._send(e.code, e.read())

            def do_POST(self):
                raw = self.rfile.read(int(self.headers.get('Content-Length') or 0))
                run = None
                body = None
                if self.path.endswith('/chat/completions'):
                    body = json.loads(raw)
                    run = log.owner(body)
                    if run is not None and run.arm.log_requests and not body.get('stream'):
                        body['return_token_ids'] = True
                        raw = json.dumps(body).encode()
                    else:
                        run = None
                req = urllib.request.Request(log.upstream + self.path.removeprefix('/v1'), data=raw, method='POST',
                                             headers={'Content-Type': 'application/json',
                                                      'Authorization': self.headers.get('Authorization') or 'Bearer EMPTY'})
                t0 = time.time()
                try:
                    with urllib.request.urlopen(req, timeout=3600) as r:
                        code, data = r.status, r.read()
                except urllib.error.HTTPError as e:
                    code, data = e.code, e.read()
                except Exception as e:  # the inference server is gone: report it the way an HTTP server would
                    code, data = 502, json.dumps({'error': {'message': f'proxy: {e}'}}).encode()
                if run is not None and code == 200:
                    resp = json.loads(data)
                    row = {'task': run.task, 'arm': run.arm.name, 'worker': log.worker, 'start': t0,
                           'latency': round(time.time() - t0, 3), 'kind': 'agent' if body.get('tools') else 'summary',
                           'request': {k: v for k, v in body.items() if k != 'return_token_ids'}, 'response': resp}
                    out = run.arm.results / 'requests'
                    out.mkdir(exist_ok=True)
                    with log.lock, gzip.open(out / f'{log.worker}.jsonl.gz', 'at') as f:
                        f.write(json.dumps(row) + '\n')
                    resp.pop('prompt_token_ids', None)
                    for ch in resp.get('choices') or []:
                        ch.pop('token_ids', None)
                    data = json.dumps(resp).encode()
                self._send(code, data)

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        return f'http://127.0.0.1:{server.server_address[1]}/v1'


def install_llm_logger(default_results: Path | None) -> None:
    """One JSON line per LiteLLM call in <results>/llm_calls.jsonl (task, latency, tokens); also advances the task's
    L4 clock. Full requests and responses are written by RequestLog."""
    import litellm
    from litellm.integrations.custom_logger import CustomLogger

    lock = threading.Lock()

    class CallLog(CustomLogger):
        def _write(self, kwargs, response, start, end, ok):
            ctx = CURRENT.get()
            results = ctx.arm.results if ctx else default_results
            if results is None:
                return
            usage = getattr(response, 'usage', None) if ok else None
            details = getattr(usage, 'completion_tokens_details', None) if usage else None
            latency = (end - start).total_seconds() if hasattr(end - start, 'total_seconds') else end - start
            choice = response.choices[0] if ok and getattr(response, 'choices', None) else None
            optional = kwargs.get('optional_params') or {}
            tools = optional.get('tools') or kwargs.get('tools')
            row = {
                'task': ctx.task if ctx else '',
                'ok': ok,
                'start': start.timestamp() if hasattr(start, 'timestamp') else start,
                'latency': latency,
                'prompt_tokens': getattr(usage, 'prompt_tokens', None),
                'completion_tokens': getattr(usage, 'completion_tokens', None),
                'reasoning_tokens': getattr(details, 'reasoning_tokens', None) if details else None,
                'finish_reason': getattr(choice, 'finish_reason', None),
                'kind': 'agent' if tools else 'summary',  # ADK's compaction summariser sends no tools
                'error': None if ok else str(kwargs.get('exception', ''))[:300],
            }
            if ctx and ctx.clock is not None:
                ctx.clock.add(latency, row['prompt_tokens'], row['completion_tokens'])
                row['l4_clock_s'] = round(ctx.clock.l4_llm, 2)
            with lock, (results / 'llm_calls.jsonl').open('a') as f:
                f.write(json.dumps(row) + '\n')

        async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):
            self._write(kwargs, response_obj, start_time, end_time, True)

        async def async_log_failure_event(self, kwargs, response_obj, start_time, end_time):
            self._write(kwargs, response_obj, start_time, end_time, False)

    litellm.callbacks = [*getattr(litellm, 'callbacks', []), CallLog()]


def install_phase(phase: str) -> None:
    """--phase agent: verification is skipped; the patch and trace are kept and the row is marked UNGRADED."""
    if phase != 'agent':
        return
    import swegemma.evaluate as ev
    from swegemma.harness.verification import save_trace_artifact
    from swegemma.models import TaskResult

    async def defer(docker, config, task, snapshot_path, **kw):
        path = save_trace_artifact(kw.get('trace'), config.results_dir, task.instance_id)
        return TaskResult(instance_id=task.instance_id, repo=task.repo, resolved=False,
                          agent_patch=kw.get('agent_patch') or '', test_output='', test_exit_code=-2,
                          duration_seconds=time.perf_counter() - (kw.get('start_time') or time.perf_counter()),
                          error=UNGRADED, trace_json_path=path)

    ev.verify_task = defer


def make_config(arm: Arm, task_ids=None, concurrency: int = 1, display: str = 'quiet'):
    from google.adk.agents.context_cache_config import ContextCacheConfig
    from google.adk.apps._configs import EventsCompactionConfig
    from swegemma.cli import _build_cli_model_registry
    from swegemma.config import EvalConfig

    budget = load_budget(arm.bundle)
    if arm.max_time_minutes:
        budget['max_time_minutes'] = arm.max_time_minutes
    config = EvalConfig(
        tasks_path=arm.tasks_file or arm.data / 'tasks.jsonl',
        snapshots_dir=arm.data / 'snapshots',
        results_dir=arm.results,
        submission_dir=arm.bundle.resolve(),
        models=_build_cli_model_registry(submission_dir=arm.bundle.resolve()),
        sandbox='subprocess',
        wheels_dir=(arm.wheels or arm.data / 'wheels'),
        timeout_seconds=budget['timeout_seconds'],
        max_tool_calls=budget['max_tool_calls'],
        max_turns=budget['max_turns'],
        max_time_minutes=budget['max_time_minutes'],
        task_ids=task_ids,
        concurrency=concurrency,
        display_mode=display,
        events_compaction_config=EventsCompactionConfig(
            compaction_interval=15, overlap_size=2, token_threshold=14336, event_retention_size=5)
        if arm.compaction else None,
        context_cache_config=ContextCacheConfig(min_tokens=2048, ttl_seconds=1800, cache_intervals=10)
        if arm.compaction else None,
    )
    return config, budget


def make_evaluator(config, arm: Arm, worker: str):
    from adk_eval_core.tracing import SessionTrace
    from swegemma.evaluate import Evaluator

    clock = parse_clock(arm.l4_clock)

    class ColabEvaluator(Evaluator):
        async def evaluate_task(self, task, *a, **kw):
            ctx = RunCtx(arm=arm, task=task.instance_id, env=task_env(arm, task.repo), worker=worker,
                         clock=Clock(*clock) if clock else None, task_text=(task.problem_statement or '')[:200])
            CURRENT.set(ctx)
            ACTIVE[task.instance_id] = ctx
            t0 = time.time()
            try:
                res = await super().evaluate_task(task, *a, **kw)
            finally:
                ACTIVE.pop(task.instance_id, None)
            row = {'task': task.instance_id, 'start': t0, 'end': time.time(), 'worker': worker}
            if ctx.clock is not None:
                row.update(l4_llm_s=round(ctx.clock.l4_llm, 1), real_llm_s=round(ctx.clock.real_llm, 1))
            with (Path(self.config.results_dir) / 'task_timing.jsonl').open('a') as f:
                f.write(json.dumps(row) + '\n')
            return res

        async def _run_agent_sandbox(self, task, *a, **kw):
            if arm.agent == 'gold':
                return task.patch, None, SessionTrace()
            if arm.agent == 'noop':
                return '', None, SessionTrace()
            patch, error, trace = await super()._run_agent_sandbox(task, *a, **kw)
            # task_results.jsonl keeps agent_error only for unresolved tasks; keep why every agent phase ended
            ctx = kw.get('context')
            run = CURRENT.get()
            row = {'task': task.instance_id, 'agent_error': error, 'patch_bytes': len(patch or ''),
                   'tool_calls': getattr(ctx, 'tool_calls_used', None), 'llm_calls': getattr(ctx, 'llm_calls_used', None),
                   'agent_seconds': getattr(ctx, 'agent_elapsed_seconds', None),
                   'patch_submitted': getattr(ctx, 'patch_submitted', None), 'worker': worker}
            if run is not None and run.clock is not None:
                row.update(clock='l4', real_llm_seconds=round(run.clock.real_llm, 1),
                           l4_llm_seconds=round(run.clock.l4_llm, 1))
            with (Path(self.config.results_dir) / 'agent_phase.jsonl').open('a') as f:
                f.write(json.dumps(row, default=str) + '\n')
            return patch, error, trace

    return ColabEvaluator(config)


def prepare_results(arm: Arm, meta: dict) -> None:
    arm.results.mkdir(parents=True, exist_ok=True)
    gc = arm.results / '.sandbox_gitconfig'
    if not gc.exists():
        gc.write_text(GITCONFIG)
    mp = arm.results / 'run_meta.json'
    if not mp.exists():
        mp.write_text(json.dumps(meta, indent=2, default=str))


async def run_one(ev, task, arm: Arm, index: int = 1):
    """One task through the Evaluator with a fresh context, as Evaluator.run's worker does; returns its TaskResult."""
    from swegemma.context import SwegemmaContext
    from swegemma.models import TaskResult
    from swegemma.results import append_task_result

    t0 = time.perf_counter()
    context = None
    try:
        task = ev._hydrate_task_from_secret(task)
        context = SwegemmaContext(docker_manager=ev.docker, container_id='', problem_statement=task.problem_statement,
                                  hints_text=getattr(task, 'hints_text', '') or '', task=task, repo=task.repo,
                                  graph_dir=ev.config.graph_dir, embeddings_dir=ev.config.embeddings_dir,
                                  budget=ev.config.budget, harness=ev.config.harness)
        res = await ev.evaluate_task(task, task_index=index, total_tasks=1, context=context)
    except Exception as e:  # same row shape as Evaluator.run's worker
        res = TaskResult(instance_id=task.instance_id, repo=task.repo, resolved=False, agent_patch='', test_output='',
                         test_exit_code=-1, duration_seconds=time.perf_counter() - t0,
                         error=f'Unexpected evaluation worker error: {e}',
                         total_llm_calls=getattr(context, 'llm_calls_used', 0) or 0,
                         tool_calls=getattr(context, 'tool_calls_used', 0) or 0)
    res.task_index = index
    # appends one line (several workers share the file); summary.json is left out because each worker knows only its own
    append_task_result(res, arm.results)
    return res


def gitconfig_for(results: Path) -> Path:
    gc = results / '.sandbox_gitconfig'
    gc.parent.mkdir(parents=True, exist_ok=True)
    if not gc.exists():
        gc.write_text(GITCONFIG)
    return gc


async def queue_worker(qdir: Path, worker: str, deadline: float | None, netns: bool) -> int:
    from colab_eval import taskqueue as Q
    from swegemma.models import load_tasks

    arms = {a['name']: Arm.from_json(a) for a in json.loads((qdir / 'arms.json').read_text())}
    gitconfig = gitconfig_for(qdir / 'run')
    patch_subprocess_sandbox(None, gitconfig, netns)
    install_l4_clock()
    install_llm_logger(None)
    evaluators, tasks = {}, {}
    n = 0
    while True:
        if deadline is not None and time.time() > deadline:
            print(f'[{worker}] deadline reached after {n} tasks')
            break
        item = Q.claim(qdir, worker)
        if item is None:
            print(f'[{worker}] queue empty after {n} tasks')
            break
        spec = json.loads(item.read_text())
        arm = arms[spec['arm']]
        if arm.name not in evaluators:
            config, budget = make_config(arm)
            prepare_results(arm, {'arm': arm.name, 'agent': arm.agent, 'bundle': str(arm.bundle), 'budget': budget,
                                  'l4_clock': arm.l4_clock, 'real_time_minutes': arm.real_time_minutes, 'netns': netns,
                                  'compaction': arm.compaction, 'queue': str(qdir), 'started': time.time()})
            evaluators[arm.name] = make_evaluator(config, arm, worker)
            tasks[arm.name] = {t.instance_id: t for t in load_tasks(config.tasks_path)}
        task = tasks[arm.name].get(spec['task'])
        if task is None:
            print(f'[{worker}] {spec["task"]} is not in {arm.name}\'s tasks; skipped', file=sys.stderr)
            Q.finish(qdir, item, ok=False)
            continue
        res = await run_one(evaluators[arm.name], task, arm, index=spec.get('seq', 0))
        Q.finish(qdir, item, ok=True)
        n += 1
        print(f'[{worker}] {arm.name}/{task.instance_id}: resolved={res.resolved} error={(res.error or "")[:80]}', flush=True)
    for ev in evaluators.values():
        if hasattr(ev.docker, 'cleanup_all'):
            ev.docker.cleanup_all()
    return 0


async def grade(arm: Arm, concurrency: int, shard: str | None) -> int:
    """Verifies the UNGRADED rows of arm.results (from --phase agent) and rewrites task_results.jsonl in place."""
    from swegemma.deduplication import resolve_task_snapshot_paths
    from swegemma.harness.verification import verify_task
    from swegemma.models import load_tasks
    from swegemma.results import _serialize_task_result

    config, _ = make_config(arm)
    ev = make_evaluator(config, arm, 'grader')
    out = arm.results / 'task_results.jsonl'
    rows = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
    todo = [r for r in rows if r.get('error') == UNGRADED]
    if shard:
        k, m = map(int, shard.split('/'))
        todo = [r for i, r in enumerate(todo) if i % m == k]
    by_id = {t.instance_id: t for t in load_tasks(config.tasks_path)}
    sem = asyncio.Semaphore(max(1, concurrency))
    graded: dict = {}

    async def one(r):
        task = ev._hydrate_task_from_secret(by_id[r['instance_id']])
        pf = arm.results / 'patches' / f'{task.instance_id.replace("/", "__")}.patch'
        patch = pf.read_text() if pf.exists() else ''
        if not patch.strip():
            graded[task.instance_id] = dict(r, error=None, resolved=False, test_exit_code=-1)
            return
        async with sem:
            CURRENT.set(RunCtx(arm=arm, task=task.instance_id, env=task_env(arm, task.repo), worker='grader'))
            snap, base, ppath = resolve_task_snapshot_paths(config.snapshots_dir, task.instance_id, task.repo)
            res = await verify_task(ev.docker, config, task, snap, base_snapshot_path=base, patch_path=ppath,
                                    agent_patch=patch, agent_error=None, trace=None, start_time=time.perf_counter())
        if res.test_output:
            (arm.results / 'test_outputs').mkdir(exist_ok=True)
            (arm.results / 'test_outputs' / f'{task.instance_id.replace("/", "__")}.log').write_text(res.test_output)
        new = _serialize_task_result(res)
        graded[task.instance_id] = dict(r, resolved=new['resolved'], test_exit_code=new['test_exit_code'],
                                        error=new['error'], grade_seconds=new['duration_seconds'])
        print(f'graded {task.instance_id}: resolved={new["resolved"]}', flush=True)

    await asyncio.gather(*(one(r) for r in todo))
    # re-read: agent workers may still be appending rows
    lock = out.with_suffix('.lock')
    with open(lock, 'w') as lf:
        import fcntl
        fcntl.flock(lf, fcntl.LOCK_EX)
        cur = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
        merged = [graded.get(r['instance_id'], r) if r.get('error') == UNGRADED else r for r in cur]
        tmp = out.with_suffix('.tmp')
        tmp.write_text(''.join(json.dumps(r) + '\n' for r in merged))
        tmp.replace(out)
    res_n = sum(1 for r in graded.values() if r.get('resolved'))
    print(f'graded {len(graded)} rows of {arm.name}: {res_n} resolved')
    if hasattr(ev.docker, 'cleanup_all'):
        ev.docker.cleanup_all()
    return 0


def parse_deadline(s: str | None) -> float | None:
    if not s:
        return None
    return time.time() + float(s[1:]) * 60 if s.startswith('+') else float(s)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--bundle', type=Path, default=Path('submission'))
    ap.add_argument('--data', type=Path, help='competition data: tasks.jsonl, snapshots/, wheels/, sandbox/setup.py')
    ap.add_argument('--results-dir', type=Path)
    ap.add_argument('--sandbox-site', type=Path, help='venv built by build_sandbox_env.py')
    ap.add_argument('--sandbox-site-map', type=Path, help='JSON {repo: venv} for repos with their own environment')
    ap.add_argument('--tasks-file', type=Path, help='tasks.jsonl to use instead of <data>/tasks.jsonl')
    ap.add_argument('--setup-py', type=Path, help="the scorer's sandbox/setup.py (default <data>/sandbox/setup.py)")
    ap.add_argument('--wheels', type=Path, help='wheels copied into each sandbox (default <data>/wheels)')
    ap.add_argument('--no-deps', action='store_true', help='skip sandbox_deps.py (environments with their own deps)')
    ap.add_argument('--agent', choices=['llm', 'gold', 'noop'], default='llm')
    ap.add_argument('--phase', choices=['all', 'agent', 'grade'], default='all')
    ap.add_argument('--base-url', default=os.environ.get('LOCAL_INFERENCE_URL', 'http://127.0.0.1:8000/v1'))
    ap.add_argument('--task-ids', nargs='+')
    ap.add_argument('--ids-file', type=Path)
    ap.add_argument('--concurrency', type=int, default=1)
    ap.add_argument('--max-time-minutes', type=float, help='override only the time budget (default: the bundle\'s)')
    ap.add_argument('--l4-clock', help='decode,prefill[,m[,lora]]: run the time budget on the modelled 4x L4 clock')
    ap.add_argument('--real-time-minutes', type=float, help='wall-clock limit per task under --l4-clock (default 30)')
    ap.add_argument('--log-requests', action='store_true', help='full requests/responses to <results>/requests/')
    ap.add_argument('--no-compaction', action='store_true', help='plain `swegemma eval` behaviour')
    ap.add_argument('--no-netns', action='store_true')
    ap.add_argument('--display', default='quiet', choices=['auto', 'dashboard', 'single', 'quiet'])
    ap.add_argument('--resume', action='store_true', help='skip tasks already in <results>/task_results.jsonl')
    ap.add_argument('--shard', help='K/M: run only every M-th task starting at K (one process per shard)')
    ap.add_argument('--queue', type=Path, help='work through a colab_eval.queue directory instead of --task-ids')
    ap.add_argument('--worker', default=str(os.getpid()), help='worker name in queue mode')
    ap.add_argument('--deadline', help='queue mode: stop claiming after this epoch time, or +MINUTES from now')
    args = ap.parse_args(argv)

    os.environ['LOCAL_INFERENCE_URL'] = args.base_url
    for k in ('MODEL_PROXY_URL', 'LITELLM_API_BASE', 'OPENAI_BASE_URL'):
        os.environ.pop(k, None)
    os.environ.setdefault('LOCAL_API_KEY', 'EMPTY')
    netns = not args.no_netns and netns_works()
    if not args.no_netns and not netns:
        print('[warn] unshare -n -r is not permitted here; sandbox commands keep network access', file=sys.stderr)

    def request_log(on: bool) -> None:
        if on:
            url = RequestLog(args.base_url, args.worker).start()
            os.environ['LOCAL_INFERENCE_URL'] = url
            print(f'request log: {url} -> {args.base_url}')

    if args.queue:
        qdir = args.queue.resolve()
        if args.phase == 'grade':  # every arm of the queue, e.g. on a CPU runtime after an agent-only G4 session
            arms = [Arm.from_json(a) for a in json.loads((qdir / 'arms.json').read_text())]
            patch_subprocess_sandbox(None, gitconfig_for(qdir / 'run'), netns)
            for arm in arms:
                if (arm.results / 'task_results.jsonl').exists():
                    asyncio.run(grade(arm, args.concurrency, args.shard))
            return 0
        install_phase(args.phase)
        request_log(any(a.get('log_requests') for a in json.loads((qdir / 'arms.json').read_text())))
        return asyncio.run(queue_worker(qdir, args.worker, parse_deadline(args.deadline), netns))

    if not (args.data and args.results_dir and args.sandbox_site):
        ap.error('--data, --results-dir and --sandbox-site are required without --queue')
    site_map = json.loads(args.sandbox_site_map.read_text()) if args.sandbox_site_map else {}
    arm = Arm(name=args.results_dir.name, bundle=args.bundle, data=args.data.resolve(),
              results=args.results_dir.resolve(), sandbox_site=args.sandbox_site.resolve(),
              site_map={r: Path(p) for r, p in site_map.items()}, deps=not args.no_deps,
              setup_py=args.setup_py, wheels=args.wheels, tasks_file=args.tasks_file,
              max_time_minutes=args.max_time_minutes, l4_clock=args.l4_clock,
              real_time_minutes=args.real_time_minutes, log_requests=args.log_requests, agent=args.agent,
              compaction=not args.no_compaction)
    results = arm.results
    results.mkdir(parents=True, exist_ok=True)
    gitconfig = gitconfig_for(results)
    default_env = task_env(arm, '')
    patch_subprocess_sandbox(default_env, gitconfig, netns)
    install_phase(args.phase)
    if args.phase == 'grade':
        return asyncio.run(grade(arm, args.concurrency, args.shard))
    install_l4_clock()
    if args.agent == 'llm':
        install_llm_logger(results)
        request_log(args.log_requests)

    tasks_path = arm.tasks_file or arm.data / 'tasks.jsonl'
    ids = args.task_ids or (args.ids_file.read_text().split() if args.ids_file else None)
    if args.shard:
        # swegemma's tools are synchronous, so tasks sharing one event loop stall while any of them runs a command.
        # Separate processes (one shard each, run with --concurrency 1 like the scorer) keep the GPU busy instead.
        k, m = map(int, args.shard.split('/'))
        if ids is None:
            ids = [json.loads(l)['instance_id'] for l in tasks_path.read_text().splitlines() if l.strip()]
        ids = [i for n, i in enumerate(ids) if n % m == k]
    earlier: list[str] = []  # the Evaluator starts task_results.jsonl afresh, so a resumed run merges these back
    if args.resume and (results / 'task_results.jsonl').exists():
        earlier = [l for l in (results / 'task_results.jsonl').read_text().splitlines() if l.strip()]
        done = {json.loads(l)['instance_id'] for l in earlier}
        if ids is None:
            ids = [json.loads(l)['instance_id'] for l in tasks_path.read_text().splitlines() if l.strip()]
        ids = [i for i in ids if i not in done]
        print(f'resume: {len(done)} done, {len(ids)} to go')
        if not ids:
            return 0

    config, budget = make_config(arm, task_ids=ids, concurrency=args.concurrency, display=args.display)
    meta = {'agent': args.agent, 'bundle': str(args.bundle), 'budget': budget, 'netns': netns,
            'compaction': not args.no_compaction, 'concurrency': args.concurrency, 'base_url': args.base_url,
            'l4_clock': args.l4_clock, 'phase': args.phase, 'started': time.time()}
    (results / 'run_meta.json').write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))
    result = asyncio.run(make_evaluator(config, arm, args.worker).run())
    print(f'Evaluation complete: {result.resolved}/{result.total} resolved ({result.resolution_rate:.2%})')
    if earlier:
        out = results / 'task_results.jsonl'
        new = [l for l in out.read_text().splitlines() if l.strip()] if out.exists() else []
        rerun = {json.loads(l)['instance_id'] for l in new}
        rows = [l for l in earlier if json.loads(l)['instance_id'] not in rerun] + new
        out.write_text('\n'.join(rows) + '\n')
        n_res = sum(json.loads(l).get('resolved') is True for l in rows)
        print(f'with earlier results: {n_res}/{len(rows)} resolved')
    return 0


if __name__ == '__main__':
    sys.exit(main())
