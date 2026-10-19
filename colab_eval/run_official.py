"""Runs a submission bundle through the official swegemma scorer without Docker (Colab, Kaggle notebooks, any Linux box).

`swegemma eval` alone is not what Kaggle runs: the scorer's scripts/inference.py (not shipped in the wheel) also reads the
bundle's eval_config.yaml and switches on ADK event compaction and context caching, and its Docker sandbox has a fixed
set of test packages. This wrapper reproduces those parts around the unmodified swegemma 0.2.11 / adk_submission 0.2.13:

  * EvalConfig from <bundle>/eval_config.yaml (inference.py defaults: 100 tool calls, 60 min, 500 turns, 300 s commands),
    plus EventsCompactionConfig(15, 2, 14336, 5) and ContextCacheConfig(2048, 1800, 10) as in HARNESS_README section 7.2.
  * `--sandbox subprocess`, patched to behave like the swebench-sandbox image:
      - every per-task venv sees only --sandbox-site (built by build_sandbox_env.py: the Dockerfile's pip installs plus the
        newest py3.13 wheel of every package in the competition wheels dir, which is what Docker mode unpacks), never the
        harness's own packages;
      - the scorer's sandbox/setup.py --fast-path runs per task (subprocess mode skips it), then sandbox_deps.py, which
        adds the other task repos' wheels and the wheel versions the task's own pyproject.toml requires;
      - git identity and init.defaultBranch from a private gitconfig (the image sets them globally);
      - commands run in a private network namespace (`unshare -n -r`), as Docker's network_mode="none" does.
  * --max-time-minutes overrides only the time budget, so G4 concurrency does not turn into "time" failures.
  * --agent gold submits the reference patch (environment check), --agent noop an empty one.
  * every LLM call is appended to <results>/llm_calls.jsonl (task, latency, prompt/completion/reasoning tokens).

  python -m colab_eval.run_official --bundle submission --data /content/comp --results-dir /content/results/v8 \
      --sandbox-site /content/sbx --concurrency 16 --max-time-minutes 30
"""

from __future__ import annotations

import argparse
import asyncio
import contextvars
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

import yaml

# inference.py defaults (HARNESS_README section 7.1)
DEFAULTS = {'max_tool_calls': 100, 'max_time_minutes': 60.0, 'max_turns': 500, 'timeout_seconds': 300}
CURRENT_TASK: contextvars.ContextVar[str] = contextvars.ContextVar('current_task', default='')
# A new namespace starts with lo down; Docker's network_mode="none" keeps loopback (pytest-httpbin's local server).
# requests' connect-timeout tests dial the unroutable 10.255.255.1 and expect a timeout, which only a network that drops
# the packets gives (no network at all fails them at once with ENETUNREACH), so that /24 goes to a dummy device.
NETNS_PRELUDE = ('ip link set lo up 2>/dev/null; ip link add _bh type dummy 2>/dev/null && ip link set _bh up '
                 '&& ip route add 10.255.255.0/24 dev _bh 2>/dev/null\n')
DEPS_SCRIPT =Path(__file__).with_name('sandbox_deps.py')
GITCONFIG ='[user]\n\temail = agent@eval\n\tname = Agent\n[init]\n\tdefaultBranch = main\n[safe]\n\tdirectory = *\n'


def load_budget(bundle: Path) -> dict:
    """The bundle's evaluation: block over inference.py's defaults."""
    budget = dict(DEFAULTS)
    cfg = bundle / 'eval_config.yaml'
    if cfg.exists():
        ev = (yaml.safe_load(cfg.read_text()) or {}).get('evaluation') or {}
        budget.update({k: ev[k] for k in DEFAULTS if ev.get(k) is not None})
    return budget


def netns_works() -> bool:
    try:
        return subprocess.run(['unshare', '-n', '-r', 'true'], capture_output=True, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def patch_subprocess_sandbox(sandbox_site: Path, setup_py: Path, wheels_dir: Path, gitconfig: Path, netns: bool) -> None:
    """Makes swegemma's SubprocessManager behave like the Docker image (see module docstring)."""
    import swegemma.harness.container_setup as cs
    import swegemma.sandbox.subprocess as sp

    site_dirs = sorted(str(p) for p in sandbox_site.glob('lib/python3*/site-packages'))
    if not site_dirs:
        raise SystemExit(f'{sandbox_site} has no lib/python3*/site-packages; run build_sandbox_env.py first')
    sandbox_python = sandbox_site / 'bin' / 'python3'

    orig_start = sp.SubprocessManager.start

    def start(self) -> str:
        sid = orig_start(self)
        venv_dir = self._sandboxes[sid]['venv']
        cfg = venv_dir / 'pyvenv.cfg'
        cfg.write_text(cfg.read_text().replace('include-system-site-packages = true', 'include-system-site-packages = false'))
        for d in venv_dir.glob('lib/python*/site-packages'):
            (d / '_host_env.pth').write_text('\n'.join(site_dirs) + '\n')
        return sid

    sp.SubprocessManager.start = start
    # venv.create() builds per-task venvs from the harness's base interpreter, so --sandbox-site must match its version
    want = f'python{sys.version_info.major}.{sys.version_info.minor}'
    if not any(f'/{want}/' in d for d in site_dirs):
        raise SystemExit(f'{sandbox_site} is not a {want} venv; build it with the interpreter that runs this harness')

    orig_env = sp.build_sanitized_env

    def build_env(*a, **kw):
        env = orig_env(*a, **kw)
        env['GIT_CONFIG_GLOBAL'] = str(gitconfig)
        env['PATH'] = env['PATH'].replace(str(Path(sys.executable).parent), str(sandbox_python.parent))
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
        docker.copy_to(container_id, setup_py, '/tmp/setup.py')
        docker.copy_to(container_id, DEPS_SCRIPT, '/tmp/sandbox_deps.py')
        res = docker.exec(container_id, f'python3 /tmp/setup.py {"--fast-path" if fast_path else ""} {repo}'.strip())
        if res.exit_code != 0:
            print(f'[warn] sandbox setup.py failed for {repo}: {res.stderr[-500:]}', file=sys.stderr)
        res = docker.exec(container_id, f'python3 /tmp/sandbox_deps.py {repo} {wheels_dir} /workspace')
        if 'installed' in res.stdout and os.environ.get('SWEGEMMA_COLAB_VERBOSE'):
            print(f'[deps] {repo}: {res.stdout.strip()[-300:]}', file=sys.stderr)
        docker.exec(container_id, 'rm -f /tmp/setup.py /tmp/sandbox_deps.py')

    cs.install_test_dependencies = install_test_dependencies
    import swegemma.evaluate as ev
    ev.install_test_dependencies = install_test_dependencies
    for mod in list(sys.modules.values()):
        if getattr(mod, '__name__', '').startswith('swegemma.harness') and hasattr(mod, 'install_test_dependencies'):
            mod.install_test_dependencies = install_test_dependencies


def install_llm_logger(path: Path) -> None:
    """Appends one JSON line per LiteLLM call: task, latency and token usage."""
    import litellm
    from litellm.integrations.custom_logger import CustomLogger

    lock = threading.Lock()

    class CallLog(CustomLogger):
        def _write(self, kwargs, response, start, end, ok):
            usage = getattr(response, 'usage', None) if ok else None
            details = getattr(usage, 'completion_tokens_details', None) if usage else None
            row = {
                'task': CURRENT_TASK.get(),
                'ok': ok,
                'start': start.timestamp() if hasattr(start, 'timestamp') else start,
                'latency': (end - start).total_seconds() if hasattr(end - start, 'total_seconds') else end - start,
                'prompt_tokens': getattr(usage, 'prompt_tokens', None),
                'completion_tokens': getattr(usage, 'completion_tokens', None),
                'reasoning_tokens': getattr(details, 'reasoning_tokens', None) if details else None,
                'finish_reason': (response.choices[0].finish_reason if ok and getattr(response, 'choices', None) else None),
                'error': None if ok else str(kwargs.get('exception', ''))[:300],
            }
            with lock, path.open('a') as f:
                f.write(json.dumps(row) + '\n')

        async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):
            self._write(kwargs, response_obj, start_time, end_time, True)

        async def async_log_failure_event(self, kwargs, response_obj, start_time, end_time):
            self._write(kwargs, response_obj, start_time, end_time, False)

    litellm.callbacks = [*getattr(litellm, 'callbacks', []), CallLog()]


def make_evaluator(config, agent: str):
    from adk_eval_core.tracing import SessionTrace
    from swegemma.evaluate import Evaluator

    class ColabEvaluator(Evaluator):
        async def evaluate_task(self, task, *a, **kw):
            CURRENT_TASK.set(task.instance_id)
            t0 = time.time()
            res = await super().evaluate_task(task, *a, **kw)
            with (Path(self.config.results_dir) / 'task_timing.jsonl').open('a') as f:
                f.write(json.dumps({'task': task.instance_id, 'start': t0, 'end': time.time()}) + '\n')
            return res

        async def _run_agent_sandbox(self, task, *a, **kw):
            if agent == 'gold':
                return task.patch, None, SessionTrace()
            if agent == 'noop':
                return '', None, SessionTrace()
            patch, error, trace = await super()._run_agent_sandbox(task, *a, **kw)
            # task_results.jsonl keeps agent_error only for unresolved tasks; keep why every agent phase ended
            ctx = kw.get('context')
            row = {'task': task.instance_id, 'agent_error': error, 'patch_bytes': len(patch or ''),
                   'tool_calls': getattr(ctx, 'tool_calls_used', None), 'llm_calls': getattr(ctx, 'llm_calls_used', None),
                   'agent_seconds': getattr(ctx, 'agent_elapsed_seconds', None),
                   'patch_submitted': getattr(ctx, 'patch_submitted', None)}
            with (Path(self.config.results_dir) / 'agent_phase.jsonl').open('a') as f:
                f.write(json.dumps(row, default=str) + '\n')
            return patch, error, trace

    return ColabEvaluator(config)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--bundle', type=Path, default=Path('submission'))
    ap.add_argument('--data', type=Path, required=True, help='competition data: tasks.jsonl, snapshots/, wheels/, sandbox/setup.py')
    ap.add_argument('--results-dir', type=Path, required=True)
    ap.add_argument('--sandbox-site', type=Path, required=True, help='venv built by build_sandbox_env.py')
    ap.add_argument('--agent', choices=['llm', 'gold', 'noop'], default='llm')
    ap.add_argument('--base-url', default=os.environ.get('LOCAL_INFERENCE_URL', 'http://127.0.0.1:8000/v1'))
    ap.add_argument('--task-ids', nargs='+')
    ap.add_argument('--ids-file', type=Path)
    ap.add_argument('--concurrency', type=int, default=1)
    ap.add_argument('--max-time-minutes', type=float, help='override only the time budget (default: the bundle\'s)')
    ap.add_argument('--no-compaction', action='store_true', help='plain `swegemma eval` behaviour')
    ap.add_argument('--no-netns', action='store_true')
    ap.add_argument('--display', default='quiet', choices=['auto', 'dashboard', 'single', 'quiet'])
    ap.add_argument('--resume', action='store_true', help='skip tasks already in <results>/task_results.jsonl')
    ap.add_argument('--shard', help='K/M: run only every M-th task starting at K (one process per shard)')
    args = ap.parse_args(argv)

    os.environ['LOCAL_INFERENCE_URL'] = args.base_url
    for k in ('MODEL_PROXY_URL', 'LITELLM_API_BASE', 'OPENAI_BASE_URL'):
        os.environ.pop(k, None)
    os.environ.setdefault('LOCAL_API_KEY', 'EMPTY')

    data = args.data.resolve()
    results = args.results_dir.resolve()
    results.mkdir(parents=True, exist_ok=True)
    gitconfig = results / '.sandbox_gitconfig'
    gitconfig.write_text(GITCONFIG)
    netns = not args.no_netns and netns_works()
    if not args.no_netns and not netns:
        print('[warn] unshare -n -r is not permitted here; sandbox commands keep network access', file=sys.stderr)
    patch_subprocess_sandbox(args.sandbox_site.resolve(), data / 'sandbox' / 'setup.py', data / 'wheels', gitconfig, netns)
    if args.agent == 'llm':
        install_llm_logger(results / 'llm_calls.jsonl')

    from google.adk.agents.context_cache_config import ContextCacheConfig
    from google.adk.apps._configs import EventsCompactionConfig
    from swegemma.cli import _build_cli_model_registry
    from swegemma.config import EvalConfig

    budget = load_budget(args.bundle)
    if args.max_time_minutes:
        budget['max_time_minutes'] = args.max_time_minutes
    ids = args.task_ids or (args.ids_file.read_text().split() if args.ids_file else None)
    if args.shard:
        # swegemma's tools are synchronous, so tasks sharing one event loop stall while any of them runs a command.
        # Separate processes (one shard each, run with --concurrency 1 like the scorer) keep the GPU busy instead.
        k, m = map(int, args.shard.split('/'))
        if ids is None:
            ids = [json.loads(l)['instance_id'] for l in (data / 'tasks.jsonl').read_text().splitlines() if l.strip()]
        ids = [i for n, i in enumerate(ids) if n % m == k]
    earlier: list[str] = []  # the Evaluator starts task_results.jsonl afresh, so a resumed run merges these back
    if args.resume and (results / 'task_results.jsonl').exists():
        earlier = [l for l in (results / 'task_results.jsonl').read_text().splitlines() if l.strip()]
        done = {json.loads(l)['instance_id'] for l in earlier}
        if ids is None:
            ids = [json.loads(l)['instance_id'] for l in (data / 'tasks.jsonl').read_text().splitlines() if l.strip()]
        ids = [i for i in ids if i not in done]
        print(f'resume: {len(done)} done, {len(ids)} to go')
        if not ids:
            return 0

    config = EvalConfig(
        tasks_path=data / 'tasks.jsonl',
        snapshots_dir=data / 'snapshots',
        results_dir=results,
        submission_dir=args.bundle.resolve(),
        models=_build_cli_model_registry(submission_dir=args.bundle.resolve()),
        sandbox='subprocess',
        wheels_dir=data / 'wheels',
        timeout_seconds=budget['timeout_seconds'],
        max_tool_calls=budget['max_tool_calls'],
        max_turns=budget['max_turns'],
        max_time_minutes=budget['max_time_minutes'],
        task_ids=ids,
        concurrency=args.concurrency,
        display_mode=args.display,
        events_compaction_config=None if args.no_compaction else EventsCompactionConfig(
            compaction_interval=15, overlap_size=2, token_threshold=14336, event_retention_size=5),
        context_cache_config=None if args.no_compaction else ContextCacheConfig(
            min_tokens=2048, ttl_seconds=1800, cache_intervals=10),
    )
    meta = {'agent': args.agent, 'bundle': str(args.bundle), 'budget': budget, 'netns': netns,
            'compaction': not args.no_compaction, 'concurrency': args.concurrency, 'base_url': args.base_url,
            'started': time.time()}
    (results / 'run_meta.json').write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))
    result = asyncio.run(make_evaluator(config, args.agent).run())
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
