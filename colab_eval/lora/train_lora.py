"""LoRA fine-tuning of the competition checkpoint on build_sft.py sequences, inside a fixed wall-clock budget.

  python -m colab_eval.lora.train_lora --model /content/model --data /content/sft/sft.jsonl --out /content/lora \
      --budget-min 135 [--epochs 2 --rank 16 --alpha 32 --lr 1e-4 --accum 8 --save-every-min 30]
  python -m colab_eval.lora.train_lora --tiny --model <dir with config.json> --data sft.jsonl --out /tmp/x   # CPU check

The base is google/gemma-4-31B-it-qat-w4a16-ct itself, decompressed to bf16 (compressed-tensors, run_compressed=False),
so the adapter is trained on the weights the scorer serves (about 62 GB on the G4's 96 GB; --keep-compressed keeps
the 4-bit weights and decompresses per layer if memory is short). LoRA goes on the language model's q/k/v/o/gate/up/
down projections only (adapter.TARGET_REGEX): vLLM rejects anything else. Each sequence is one prompt-plus-completion
segment; the loss covers only the model's own spans (label_spans), and logits are computed only at those positions,
in chunks, so a 16k-token sequence never materialises a 16k x 262k logit matrix. The run measures its speed on the
first steps and sizes the cosine schedule to finish inside --budget-min, so a slow GPU means fewer steps, never an
overrun. Adapters are saved every --save-every-min minutes (checkpoints/step_N) and at the end (<out>/main_lora, ready
for a bundle's adapters/ dir; checked with adapter.check against the model's shapes).
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from colab_eval.lora.adapter import TARGET_REGEX, check, load_shapes  # noqa: E402


def load_data(path: Path, max_len: int) -> list[dict]:
    rows = []
    for line in path.read_text().splitlines():
        if line.strip():
            r = json.loads(line)
            if r['n_tokens'] <= max_len and r['n_labels'] > 0:
                rows.append(r)
    return rows


def tiny_model(model_dir: Path):
    """A 2-layer random Gemma4ForConditionalGeneration with the real config's structure (one sliding and one full
    attention layer, k_eq_v, the real vocabulary), for checking this script on a CPU."""
    import torch
    from transformers import Gemma4Config, Gemma4ForConditionalGeneration

    cfg = json.loads((model_dir / 'config.json').read_text())
    cfg.pop('quantization_config', None)
    t = cfg['text_config']
    t.update(hidden_size=64, intermediate_size=128, num_hidden_layers=2, num_attention_heads=2, num_key_value_heads=1,
             head_dim=32, global_head_dim=64, num_global_key_value_heads=1, layer_types=['sliding_attention', 'full_attention'],
             sliding_window=16)
    v = cfg.get('vision_config') or {}
    v.update(hidden_size=32, intermediate_size=64, num_hidden_layers=1, num_attention_heads=2, num_key_value_heads=2,
             head_dim=16)
    if cfg.get('audio_config'):
        cfg['audio_config'] = None
    config = Gemma4Config(**cfg)
    torch.manual_seed(0)
    return Gemma4ForConditionalGeneration(config).to(torch.float32)


def real_model(model_dir: Path, keep_compressed: bool):
    import torch
    from transformers import CompressedTensorsConfig, Gemma4ForConditionalGeneration

    return Gemma4ForConditionalGeneration.from_pretrained(
        model_dir, dtype=torch.bfloat16, device_map={'': 0}, attn_implementation='sdpa',
        quantization_config=CompressedTensorsConfig(run_compressed=keep_compressed))


def module_shapes(model) -> dict[str, tuple[int, int]]:
    """(out, in) of the language-model projections, named like the checkpoint (for adapter.check)."""
    import re

    import torch

    out = {}
    pat = re.compile(TARGET_REGEX)
    for name, mod in model.named_modules():
        if pat.fullmatch(name) and isinstance(mod, torch.nn.Linear):
            out[name] = (mod.out_features, mod.in_features)
    return out


def chunked_loss(base, hidden, input_ids, spans, chunk: int):
    """Mean next-token loss over the labelled positions, with logits made chunk by chunk (and recomputed in backward)."""
    import torch
    from torch.utils.checkpoint import checkpoint

    pos = torch.cat([torch.arange(s, e, device=hidden.device) for s, e in spans])
    pos = pos[pos > 0]  # position 0 has no previous token to predict it from
    targets = input_ids[0, pos]
    h = hidden[0, pos - 1]
    cap = base.config.get_text_config().final_logit_softcapping

    def part(hc, tc):
        logits = base.lm_head(hc).float()
        if cap:
            logits = torch.tanh(logits / cap) * cap
        return torch.nn.functional.cross_entropy(logits, tc, reduction='sum')

    total = hidden.new_zeros((), dtype=torch.float32)
    for i in range(0, len(pos), chunk):
        total = total + checkpoint(part, h[i:i + chunk], targets[i:i + chunk], use_reentrant=False)
    return total, len(pos)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--model', type=Path, required=True)
    ap.add_argument('--data', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--budget-min', type=float, default=135, help='wall-clock budget for the whole run')
    ap.add_argument('--epochs', type=float, default=2.0)
    ap.add_argument('--rank', type=int, default=16)
    ap.add_argument('--alpha', type=float, default=32)
    ap.add_argument('--lr', type=float, default=1e-4)
    ap.add_argument('--accum', type=int, default=8, help='sequences per optimizer step')
    ap.add_argument('--warmup', type=int, default=5, help='optimizer steps of linear warmup')
    ap.add_argument('--max-len', type=int, default=20480)
    ap.add_argument('--chunk', type=int, default=1024, help='label positions per logits chunk')
    ap.add_argument('--save-every-min', type=float, default=30)
    ap.add_argument('--keep-compressed', action='store_true')
    ap.add_argument('--tiny', action='store_true', help='random 2-layer model on CPU: checks the code path only')
    ap.add_argument('--max-steps', type=int, default=0, help='stop after this many optimizer steps (0 = schedule)')
    ap.add_argument('--seed', type=int, default=0)
    args = ap.parse_args(argv)

    import torch
    from peft import LoraConfig, get_peft_model

    t_start = time.time()
    deadline = t_start + 60 * args.budget_min
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    args.out.mkdir(parents=True, exist_ok=True)
    log = (args.out / 'train_log.jsonl').open('a')
    data = load_data(args.data, args.max_len)
    if not data:
        raise SystemExit(f'no usable sequences in {args.data}')
    if args.tiny:
        model = tiny_model(args.model)
        device = torch.device('cpu')
        for r in data:  # keep the CPU check short; the first replies follow a ~5k-token prompt
            cut = min(r['n_tokens'], 6000)
            r['input_ids'] = r['input_ids'][:cut]
            r['label_spans'] = [[s, min(e, cut)] for s, e in r['label_spans'] if s < cut]
            r['n_tokens'] = cut
            r['n_labels'] = sum(e - s for s, e in r['label_spans'])
        data = [r for r in data if r['label_spans']]
    else:
        model = real_model(args.model, args.keep_compressed)
        device = torch.device('cuda:0')
    print(f'model loaded in {time.time() - t_start:.0f}s; {len(data)} sequences, '
          f'{sum(r["n_tokens"] for r in data) / 1e6:.2f}M tokens, {sum(r["n_labels"] for r in data) / 1e6:.2f}M labels',
          flush=True)
    shapes = module_shapes(model) if args.tiny else load_shapes()  # before LoRA wraps the Linear layers
    model.config.use_cache = False
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
    model.enable_input_require_grads()
    peft_model = get_peft_model(model, LoraConfig(r=args.rank, lora_alpha=args.alpha, lora_dropout=0.0, bias='none',
                                                  target_modules=TARGET_REGEX, task_type='CAUSAL_LM'))
    base = peft_model.base_model.model  # Gemma4ForConditionalGeneration with the LoRA layers in place
    params = [p for p in peft_model.parameters() if p.requires_grad]
    print(f'trainable: {sum(p.numel() for p in params):,} parameters', flush=True)
    opt = torch.optim.AdamW(params, lr=args.lr, betas=(0.9, 0.999), weight_decay=0.0)

    order = []
    for ep in range(math.ceil(args.epochs)):
        idx = list(range(len(data)))
        random.shuffle(idx)
        order += idx
    order = order[: max(1, int(round(args.epochs * len(data))))]
    planned = max(1, math.ceil(len(order) / args.accum))
    total_steps = planned if not args.max_steps else min(planned, args.max_steps)
    step, seen_tokens, t_train, last_save = 0, 0, time.time(), time.time()

    def lr_at(s: int) -> float:
        if s < args.warmup:
            return args.lr * (s + 1) / args.warmup
        frac = (s - args.warmup) / max(1, total_steps - args.warmup)
        return args.lr * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1.0, frac))))

    def save(path: Path) -> None:
        peft_model.save_pretrained(path)
        for extra in path.iterdir():  # the submission validator accepts .json and .safetensors only
            if extra.name not in ('adapter_config.json', 'adapter_model.safetensors'):
                extra.unlink()
        cfg = json.loads((path / 'adapter_config.json').read_text())
        cfg['base_model_name_or_path'] = 'google/gemma-4-31B-it-qat-w4a16-ct'
        (path / 'adapter_config.json').write_text(json.dumps(cfg, indent=2))

    peft_model.train()
    pos = 0
    while step < total_steps and pos < len(order):
        group = order[pos: pos + args.accum]
        pos += len(group)
        for g in opt.param_groups:
            g['lr'] = lr_at(step)
        loss_sum, n_lab, n_tok = 0.0, 0, 0
        labels_in_group = sum(data[i]['n_labels'] for i in group)
        for i in group:
            r = data[i]
            ids = torch.tensor([r['input_ids']], device=device)
            hidden = base.model(input_ids=ids, use_cache=False, return_dict=True).last_hidden_state
            total, n = chunked_loss(base, hidden, ids, r['label_spans'], args.chunk)
            (total / max(1, labels_in_group)).backward()
            loss_sum += float(total)
            n_lab += n
            n_tok += ids.shape[1]
        torch.nn.utils.clip_grad_norm_(params, 1.0)
        opt.step()
        opt.zero_grad(set_to_none=True)
        step += 1
        seen_tokens += n_tok
        now = time.time()
        if step == 2 and not args.max_steps:  # size the schedule to the budget from the measured speed
            sec_per_tok = (now - t_train) / seen_tokens
            per_step = sec_per_tok * sum(r['n_tokens'] for r in data) * args.epochs / planned
            fit = int((deadline - now - 300) / max(per_step, 1e-9)) + step
            total_steps = max(step, min(planned, fit))
            print(f'speed {1 / sec_per_tok:.0f} tok/s; {total_steps} of {planned} planned steps fit the budget', flush=True)
        row = {'step': step, 'loss': loss_sum / max(1, n_lab), 'lr': lr_at(step - 1), 'tokens': n_tok,
               'labels': n_lab, 'elapsed_s': round(now - t_start, 1), 'total_steps': total_steps}
        log.write(json.dumps(row) + '\n')
        log.flush()
        print(json.dumps(row), flush=True)
        if now - last_save > 60 * args.save_every_min:
            save(args.out / 'checkpoints' / f'step_{step}')
            last_save = now
        if now > deadline - 240:
            print('budget reached', flush=True)
            break
    final = args.out / 'main_lora'
    save(final)
    errs = check(final, shapes)
    print(json.dumps({'saved': str(final), 'steps': step, 'minutes': round((time.time() - t_start) / 60, 1),
                      'adapter_problems': errs}), flush=True)
    return 1 if errs else 0


if __name__ == '__main__':
    raise SystemExit(main())
