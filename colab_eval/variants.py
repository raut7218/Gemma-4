"""Writes a variant of a bundle: the same files with a few settings changed, so arms never drift from submission/.

  python -m colab_eval.variants submission /content/bundles/C --thinking-budget 1024
  python -m colab_eval.variants submission /content/bundles/L --adapter main_lora=/content/lora/main_lora
  python -m colab_eval.variants submission /content/final --max-time-minutes 4.25 --adapter main_lora=/content/lora/main_lora

Edits are textual (the YAML files use !include, which a YAML round trip would lose), and each one must match exactly
once, so a renamed field fails loudly instead of being skipped. --adapter copies the adapter directory to
<out>/adapters/<name> and sets `adapter: <name>` on the root agent, as HARNESS_README section 3.4 describes.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path


def sub_once(path: Path, pattern: str, repl: str) -> None:
    text = path.read_text()
    new, n = re.subn(pattern, repl, text, flags=re.M)
    if n != 1:
        raise SystemExit(f'{path}: expected one match for {pattern!r}, found {n}')
    path.write_text(new)


def sampling_file(bundle: Path) -> Path:
    """The file holding generate_content_config: the !include target if there is one, else agent.yaml."""
    m = re.search(r'^generate_content_config:\s*!include\s+(\S+)', (bundle / 'agent.yaml').read_text(), re.M)
    return bundle / m.group(1) if m else bundle / 'agent.yaml'


def make(base: Path, out: Path, *, model=None, thinking_budget=None, max_output_tokens=None, temperature=None,
         max_time_minutes=None, max_tool_calls=None, adapter=None) -> Path:
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(base, out, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'adapters'))
    agent = out / 'agent.yaml'
    if model:
        sub_once(agent, r'^model:.*$', f'model: {model}')
    samp = sampling_file(out)
    if thinking_budget is not None:
        sub_once(samp, r'^(\s*)thinking_budget:.*$', rf'\g<1>thinking_budget: {thinking_budget}')
    if max_output_tokens is not None:
        sub_once(samp, r'^(\s*)max_output_tokens:.*$', rf'\g<1>max_output_tokens: {max_output_tokens}')
    if temperature is not None:
        sub_once(samp, r'^(\s*)temperature:.*$', rf'\g<1>temperature: {temperature}')
    ev = out / 'eval_config.yaml'
    if max_time_minutes is not None:
        sub_once(ev, r'^(\s*)max_time_minutes:.*$', rf'\g<1>max_time_minutes: {max_time_minutes}')
    if max_tool_calls is not None:
        sub_once(ev, r'^(\s*)max_tool_calls:.*$', rf'\g<1>max_tool_calls: {max_tool_calls}')
    if adapter:
        name, src = adapter.split('=', 1)
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', name):
            raise SystemExit(f'adapter name {name!r} is not allowed (HARNESS_README 3.4)')
        dst = out / 'adapters' / name
        dst.mkdir(parents=True)
        for f in ('adapter_config.json', 'adapter_model.safetensors'):
            shutil.copy2(Path(src) / f, dst / f)
        text = agent.read_text()
        if re.search(r'^adapter:', text, re.M):
            sub_once(agent, r'^adapter:.*$', f'adapter: {name}')
        else:
            sub_once(agent, r'^(model:.*)$', rf'\g<1>\nadapter: {name}')
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('base', type=Path)
    ap.add_argument('out', type=Path)
    ap.add_argument('--model')
    ap.add_argument('--thinking-budget', type=int)
    ap.add_argument('--max-output-tokens', type=int)
    ap.add_argument('--temperature', type=float)
    ap.add_argument('--max-time-minutes', type=float)
    ap.add_argument('--max-tool-calls', type=int)
    ap.add_argument('--adapter', help='NAME=DIR with adapter_config.json and adapter_model.safetensors')
    a = ap.parse_args(argv)
    out = make(a.base, a.out, model=a.model, thinking_budget=a.thinking_budget, max_output_tokens=a.max_output_tokens,
               temperature=a.temperature, max_time_minutes=a.max_time_minutes, max_tool_calls=a.max_tool_calls,
               adapter=a.adapter)
    print(f'wrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
