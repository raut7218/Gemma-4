"""LoRA adapters for the competition's 31B checkpoint: write a zero adapter, check an adapter the scorer's vLLM will load.

  python -m colab_eval.lora.adapter null --out adapters/null_lora [--rank 16]
  python -m colab_eval.lora.adapter check adapters/main_lora [--bundle-size-of submission_dir]
  python -m colab_eval.lora.adapter shapes --model /content/model > shapes.json   # from a local checkpoint header

Names follow PEFT on the HF Gemma4ForConditionalGeneration (base_model.model.model.language_model.layers.N.<proj>),
which the wheelhouse vLLM maps onto its own modules (gemma4_mm.py hf_to_vllm_mapper). vLLM rejects an adapter that
holds any tensor whose module name does not end in a projection it supports (lora_model.py check_unexpected_modules),
so only language-model q/k/v/o/gate/up/down projections are allowed: the vision and audio towers have their own q_proj.
The 10 full-attention layers (5, 11, ..., 59) reuse k as v (attention_k_eq_v), so they have no v_proj, and their q/o are
twice as wide (global_head_dim 512). Shapes come from the checkpoint (weight_packed is int32-packed 4-bit: in = 8 x cols);
gemma-4-31b-it-qat-w4a16-ct.shapes.json holds them for offline use. Pure Python: no numpy, torch or safetensors needed.
"""

from __future__ import annotations

import argparse
import json
import re
import struct
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHAPES = HERE / 'gemma-4-31b-it-qat-w4a16-ct.shapes.json'
BASE_MODEL = 'google/gemma-4-31B-it-qat-w4a16-ct'
PROJ = ('q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj')
# PEFT target_modules for training and in adapter_config.json: language-model projections only
TARGET_REGEX = r'.*language_model\.layers\.\d+\.(self_attn\.(q_proj|k_proj|v_proj|o_proj)|mlp\.(gate_proj|up_proj|down_proj))'
PREFIX = 'base_model.model.'
NAME = re.compile(r'^base_model\.model\.(model\.language_model\.layers\.\d+\.(?:self_attn|mlp)\.(\w+))\.lora_([AB])\.weight$')
DTYPE_BYTES = {'F16': 2, 'BF16': 2, 'F32': 4}
LIMIT_BYTES = 3 * 1024 ** 3  # whole unpacked submission (HARNESS_README 2.4)
MAX_RANK = 128


def load_shapes(path: Path = SHAPES) -> dict[str, tuple[int, int]]:
    return {m: tuple(s) for m, s in json.loads(path.read_text()).items()}


def read_header(path: Path) -> dict:
    with open(path, 'rb') as f:
        n = struct.unpack('<Q', f.read(8))[0]
        return json.loads(f.read(n))


def shapes_from_checkpoint(model_dir: Path) -> dict[str, tuple[int, int]]:
    """(out, in) of every language-model projection in a local checkpoint (compressed-tensors or plain)."""
    files = sorted(model_dir.glob('*.safetensors'))
    out: dict[str, tuple[int, int]] = {}
    for f in files:
        for name, v in read_header(f).items():
            if name == '__metadata__' or 'language_model.layers.' not in name:
                continue
            for suffix, mult in (('.weight_packed', 8), ('.weight', 1)):
                if name.endswith(suffix) and len(v['shape']) == 2:
                    mod = name[: -len(suffix)]
                    if mod.rsplit('.', 1)[-1] in PROJ:
                        out[mod] = (v['shape'][0], v['shape'][1] * mult)
    return out


def adapter_config(rank: int, alpha: float) -> dict:
    return {
        'base_model_name_or_path': BASE_MODEL, 'peft_type': 'LORA', 'task_type': 'CAUSAL_LM', 'r': rank,
        'lora_alpha': alpha, 'lora_dropout': 0.0, 'target_modules': TARGET_REGEX, 'bias': 'none',
        'fan_in_fan_out': False, 'inference_mode': True, 'init_lora_weights': True, 'modules_to_save': None,
        'use_dora': False, 'use_rslora': False, 'layers_to_transform': None, 'layers_pattern': None,
        'rank_pattern': {}, 'alpha_pattern': {}, 'revision': None,
    }


def write_null(out: Path, rank: int = 16, alpha: float | None = None, shapes: dict | None = None) -> int:
    """A rank-`rank` adapter on every projection with all-zero weights (the model's output is unchanged): for measuring
    what serving a LoRA costs (load, KV cache, decode speed) before any training. Returns the file size."""
    shapes = shapes or load_shapes()
    out.mkdir(parents=True, exist_ok=True)
    header, offset = {}, 0
    for mod, (o, i) in sorted(shapes.items()):
        for ab, shape in (('A', [rank, i]), ('B', [o, rank])):
            n = shape[0] * shape[1] * 2
            header[f'{PREFIX}{mod}.lora_{ab}.weight'] = {'dtype': 'F16', 'shape': shape, 'data_offsets': [offset, offset + n]}
            offset += n
    header['__metadata__'] = {'format': 'pt'}
    raw = json.dumps(header, separators=(',', ':')).encode()
    raw += b' ' * (-len(raw) % 8)  # the data section starts 8-byte aligned
    path = out / 'adapter_model.safetensors'
    with open(path, 'wb') as f:
        f.write(struct.pack('<Q', len(raw)))
        f.write(raw)
        chunk = b'\0' * (1 << 24)
        left = offset
        while left > 0:
            f.write(chunk[: min(left, len(chunk))])
            left -= len(chunk)
    (out / 'adapter_config.json').write_text(json.dumps(adapter_config(rank, alpha or 2.0 * rank), indent=2))
    return path.stat().st_size


def check(adapter: Path, shapes: dict | None = None, bundle: Path | None = None) -> list[str]:
    """Problems that would make the scorer's vLLM reject the adapter or the submission (empty list = loadable)."""
    shapes = shapes or load_shapes()
    errs: list[str] = []
    cfg_path, st_path = adapter / 'adapter_config.json', adapter / 'adapter_model.safetensors'
    if not cfg_path.exists() or not st_path.exists():
        return [f'{adapter} needs adapter_config.json and adapter_model.safetensors']
    extra = [p.name for p in adapter.iterdir() if p.name not in ('adapter_config.json', 'adapter_model.safetensors')]
    if extra:
        errs.append(f'files the submission validator rejects or does not need: {extra} (.json/.safetensors only)')
    cfg = json.loads(cfg_path.read_text())
    if cfg.get('peft_type', 'LORA') != 'LORA':
        errs.append(f"peft_type {cfg.get('peft_type')} is not LORA")
    if cfg.get('bias', 'none') != 'none':
        errs.append('vLLM supports bias "none" only')
    if cfg.get('modules_to_save'):
        errs.append('vLLM supports modules_to_save = null only')
    if cfg.get('use_dora'):
        errs.append('vLLM does not support DoRA')
    r = cfg.get('r')
    if not isinstance(r, int) or not 1 <= r <= MAX_RANK:
        errs.append(f'rank {r} outside 1..{MAX_RANK}')
    header = read_header(st_path)
    header.pop('__metadata__', None)
    seen = set()
    for name, v in header.items():
        m = NAME.match(name)
        if not m:
            errs.append(f'unexpected tensor {name} (only language-model projections, PEFT names)')
            continue
        mod, proj, ab = m.group(1), m.group(2), m.group(3)
        if proj not in PROJ:
            errs.append(f'{name}: vLLM has no LoRA layer for {proj}')
            continue
        if mod not in shapes:
            errs.append(f'{name}: the checkpoint has no module {mod}')
            continue
        o, i = shapes[mod]
        want = [r, i] if ab == 'A' else [o, r]
        if v['shape'] != want:
            errs.append(f'{name}: shape {v["shape"]}, expected {want}')
        if v['dtype'] not in DTYPE_BYTES:
            errs.append(f'{name}: dtype {v["dtype"]}')
        seen.add((mod, ab))
    pairs = {m for m, _ in seen}
    half = [m for m in pairs if not {(m, 'A'), (m, 'B')} <= seen]
    if half:
        errs.append(f'{len(half)} modules have lora_A or lora_B only, e.g. {half[0]}')
    if not pairs:
        errs.append('no LoRA tensors')
    size = st_path.stat().st_size
    total = size + (sum(p.stat().st_size for p in bundle.rglob('*') if p.is_file() and adapter not in p.parents)
                    if bundle else 0)
    if total >= LIMIT_BYTES:
        errs.append(f'submission would be {total / 1e9:.2f} GB unpacked, limit {LIMIT_BYTES / 1e9:.2f} GB')
    return errs


def summary(adapter: Path) -> str:
    cfg = json.loads((adapter / 'adapter_config.json').read_text())
    header = read_header(adapter / 'adapter_model.safetensors')
    header.pop('__metadata__', None)
    params = sum(v['shape'][0] * v['shape'][1] for v in header.values())
    mods = {NAME.match(n).group(1) for n in header if NAME.match(n)}
    return (f'{adapter}: rank {cfg.get("r")}, alpha {cfg.get("lora_alpha")}, {len(mods)} modules, '
            f'{params / 1e6:.1f}M params, {(adapter / "adapter_model.safetensors").stat().st_size / 1e6:.0f} MB')


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    n = sub.add_parser('null')
    n.add_argument('--out', type=Path, required=True)
    n.add_argument('--rank', type=int, default=16)
    n.add_argument('--model', type=Path, help='take shapes from this local checkpoint instead of the bundled file')
    c = sub.add_parser('check')
    c.add_argument('adapter', type=Path)
    c.add_argument('--bundle', type=Path, help='submission dir, to check the 3 GiB limit with everything else in it')
    c.add_argument('--model', type=Path)
    s = sub.add_parser('shapes')
    s.add_argument('--model', type=Path, required=True)
    args = ap.parse_args(argv)
    shapes = shapes_from_checkpoint(args.model) if getattr(args, 'model', None) else None
    if args.cmd == 'null':
        size = write_null(args.out, args.rank, shapes=shapes)
        print(f'wrote {args.out} ({size / 1e6:.0f} MB)')
        print(summary(args.out))
        return 0
    if args.cmd == 'shapes':
        print(json.dumps({m: list(v) for m, v in sorted(shapes.items())}, indent=0))
        return 0
    errs = check(args.adapter, shapes, args.bundle)
    print(summary(args.adapter) if (args.adapter / 'adapter_model.safetensors').exists() else args.adapter)
    for e in errs:
        print('ERROR', e)
    print('ok: the scorer\'s vLLM should load it' if not errs else f'{len(errs)} problem(s)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())
