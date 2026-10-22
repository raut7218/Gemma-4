"""Checks the served model before a run: does it think, and do its tool calls parse?

  python -m colab_eval.model_check [--bundle submission] [--base-url http://127.0.0.1:8000/v1] [--n 4] [--out probe.json]

Sends the bundle's own prompt and sampling (harness.agent's mapping of adk_submission 0.2.13, the fields the scorer
sends) with the six core tools, n times each in two situations: the first call of a small task, and the call after a
read_file result, which should be a multi-line edit (the case the gemma4 tool parser splits). Every response goes
through analyze.call_flags. Exit 1 when the server is not fit for a run: an HTTP error, no tool call parsed in any
response, tool-call markup left in the content, or no thinking in any response while the bundle turns thinking on.
Malformed arguments, lost thinking and the like only warn: the run's health report measures them on real tasks.
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from colab_eval.analyze import FLAGS, TITLES, call_flags  # noqa: E402
from harness.agent import chat, effective_sampling, render, thinking_body  # noqa: E402
from harness.bundle import load_submission  # noqa: E402
from harness.tools import SCHEMAS  # noqa: E402

ISSUE = ('You are evaluating a software engineering task for repository demo/units.\n\nProblem Statement:\n'
         "parse_size('10KB') returns 10 but should return 10240: the KB, MB and GB suffixes are ignored, and "
         "parse_size('2 MB') must accept the space.\n\n## Workspace Layout\nunits/__init__.py\nunits/size.py\ntests/test_size.py\n")
SOURCE = ('def parse_size(text: str) -> int:\n    """Parse a size such as 10, 10KB or 2MB into bytes."""\n'
          '    digits = "".join(ch for ch in text if ch.isdigit())\n    if not digits:\n'
          '        raise ValueError(f"no size in {text!r}")\n    return int(digits)\n')
READ = {'id': 'call_1', 'type': 'function', 'function': {'name': 'read_file', 'arguments': json.dumps({'filepath': 'units/size.py'})}}


def probes(instruction: str) -> dict[str, list[dict]]:
    first = [{'role': 'system', 'content': instruction}, {'role': 'user', 'content': ISSUE}]
    edit = first + [{'role': 'assistant', 'content': None, 'tool_calls': [READ]},
                    {'role': 'tool', 'tool_call_id': 'call_1', 'content': json.dumps(
                        {'status': 'ok', 'filepath': 'units/size.py', 'content': SOURCE, 'start_line': 1, 'end_line': 6,
                         'total_lines': 6, 'is_truncated': False})}]
    return {'first': first, 'edit': edit}


def first_llm_agent(node: dict) -> dict:
    """The agent that sends a bundle's first request: the node itself when it has a model, else the first LlmAgent
    of its sub_agents in config order."""
    if node.get('model'):
        return node
    for child in node.get('sub_agents') or []:
        if found := first_llm_agent(child):
            return found
    return {}


def verdict(results: list[tuple[str, dict | str]], thinking: bool) -> tuple[bool, list[str], list[str]]:
    """(probe name, call_flags or an error string) per response -> (fit for a run, fatal reasons, warnings)."""
    errors = [r for _, r in results if isinstance(r, str)]
    flags = [f for _, f in results if isinstance(f, dict)]
    fatal = [f'{len(errors)} request(s) failed: {errors[0][:200]}'] if errors else []
    if flags and all(f['text_only'] for f in flags):
        fatal.append('no tool call was parsed in any response')
    if any(f['markup_in_content'] for f in flags):
        fatal.append('tool-call markup left in the content: the gemma4 tool parser is off or failing')
    if thinking and flags and all(f['blank_thinking'] for f in flags):
        fatal.append('thinking is on but no response has a thought (reasoning parser or chat template)')
    warn = [f'{TITLES[k]}: {n}/{len(flags)}' for k in FLAGS if (n := sum(1 for f in flags if f[k]))]
    edits = [f for p, f in results if p == 'edit' and isinstance(f, dict)]
    if edits:
        warn.append(f"edit probe: {sum('edit_file' in f['tools'] for f in edits)}/{len(edits)} answered with edit_file")
    return not fatal, fatal, warn


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--bundle', type=Path, default=Path(__file__).resolve().parent.parent / 'submission')
    ap.add_argument('--base-url', default='http://127.0.0.1:8000/v1')
    ap.add_argument('--n', type=int, default=4, help='responses per probe')
    ap.add_argument('--out', type=Path)
    args = ap.parse_args(argv)
    sub = load_submission(args.bundle)
    root = first_llm_agent(sub['root'])  # a tree's root (SequentialAgent...) has no model: its first request is this agent's
    sampling = effective_sampling(root.get('generate_content_config') or sub['sampling'])
    instruction = render(root.get('instruction') or '', {'problem_description': ISSUE})
    req = {'model': root['model'], 'tools': SCHEMAS, **thinking_body(sampling.get('thinking_config'))}
    jobs = [(name, msgs) for name, msgs in probes(instruction).items() for _ in range(args.n)]

    def one(job):
        name, msgs = job
        try:
            return name, call_flags(req, chat(args.base_url, root['model'], msgs, sampling, {}, 600, tools=SCHEMAS))
        except Exception as e:  # noqa: BLE001 - chat retries transient errors; whatever is left is the answer
            return name, f'{type(e).__name__}: {e}'

    with ThreadPoolExecutor(max_workers=len(jobs)) as ex:
        results = list(ex.map(one, jobs))
    thinking = bool((req.get('chat_template_kwargs') or {}).get('enable_thinking'))
    ok, fatal, warn = verdict(results, thinking)
    text = ('OK' if ok else 'FAIL: ' + '; '.join(fatal)) + (f" ({'; '.join(warn)})" if warn else '')
    print(f'model check of {root["model"]} at {args.base_url}, {len(results)} responses: {text}')
    for name, r in results:
        print(f'  {name}: ' + (r if isinstance(r, str) else f"tools={r['tools']} reasoning={r['reasoning_chars']} chars "
                                + ' '.join(k for k in FLAGS if r[k])))
    if args.out:
        args.out.write_text(json.dumps({'verdict': text, 'ok': ok, 'fatal': fatal, 'warnings': warn,
                                        'results': [{'probe': n, 'flags': r} for n, r in results]}, indent=1))
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
