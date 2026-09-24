import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

plt.rcParams["font.family"] = "DejaVu Sans"
NAVY = "#1B2A4A"
INK = "#334155"
MUTED = "#64748B"
LINE = "#CBD5E1"
C = {
    "comp": "#0F766E", "bench": "#B91C1C", "arch": "#1D4ED8",
    "train": "#C2410C", "ind": "#7C3AED", "infra": "#475569", "found": "#15803D",
}
TINT = {
    "comp": "#E6F4F2", "bench": "#FBEAEA", "arch": "#E8EEFC",
    "train": "#FCEEE6", "ind": "#F1EAFD", "infra": "#EEF1F5", "found": "#E7F4EC",
}


def box(ax, x, y, w, h, title, body, kind, title_size=10.5, body_size=8.3):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.018",
                                fc=TINT[kind], ec=C[kind], lw=1.4))
    ax.add_patch(FancyBboxPatch((x, y + h - 0.006), w, 0.006, boxstyle="square,pad=0",
                                fc=C[kind], ec="none"))
    ax.text(x + 0.012, y + h - 0.03, title, fontsize=title_size, weight="bold", color=C[kind],
            va="top", ha="left")
    ax.text(x + 0.012, y + h - 0.075, body, fontsize=body_size, color=INK, va="top", ha="left",
            linespacing=1.45)


def arrow(ax, p, q, color=MUTED, label=None, lx=0, ly=0, style="-|>", ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=13, lw=1.3,
                                 color=color, linestyle=ls, shrinkA=2, shrinkB=2, zorder=6))
    if label:
        ax.text((p[0] + q[0]) / 2 + lx, (p[1] + q[1]) / 2 + ly, label, fontsize=7.6,
                color=MUTED, ha="center", va="center", style="italic",
                bbox=dict(fc="white", ec="none", pad=1.2))


# ---------------------------------------------------------------- 1. pipeline
fig, ax = plt.subplots(figsize=(11, 5.4), dpi=200)
ax.set_xlim(-0.012, 1.012); ax.set_ylim(0.0, 0.545); ax.axis("off")

box(ax, 0.00, 0.30, 0.21, 0.23, "1  Submission",
    "agent.yaml  (LlmAgent /\n  Sequential / Loop / Parallel)\nprompts/*.md · skills/\nadapters/  LoRA r ≤ 128, ≤ 8\neval_config.yaml  (budgets)\n< 3 GiB · declarative only", "comp")
box(ax, 0.26, 0.30, 0.22, 0.23, "2  Model server",
    "vLLM · 4 × NVIDIA L4 (96 GB)\ngemma-4-31b-it-qat-w4a16-ct\nmax_model_len = 32,768\ntool & reasoning parser:\n  gemma4\nmulti-LoRA routing per agent", "infra")
box(ax, 0.53, 0.30, 0.21, 0.23, "3  ADK agent loop",
    "problem statement (+hints)\n→ think → tool call → JSON\nnudges if no tool call (×3)\ncompaction every 15 events\nends on submit_patch() or\n  budget / time exhaustion", "arch")
box(ax, 0.79, 0.30, 0.21, 0.23, "4  Container A",
    "offline · 4 GiB RAM · 2 vCPU\nrepo at base_commit,\n  no future git history\nbaseline commit incl.\n  pytest.ini + conftest.py\npatch = git diff HEAD", "arch")

box(ax, 0.53, 0.02, 0.47, 0.21, "5  Container B (verification) — fresh sandbox",
    "1. apply agent patch (4 fallback passes)\n"
    "2. reset test files named in the hidden test_patch\n"
    "3. apply test_patch  →  pytest <targets>\n"
    "resolved ⇔ exit code 0 · score = resolved / total", "bench", body_size=8.6)
box(ax, 0.00, 0.02, 0.48, 0.21, "The 9 fixed tools (JSON results)",
    "run_command (300 s, 5k-char output) · write_file\n"
    "read_file (150 lines / 10k chars)\n"
    "edit_file (exact → whitespace-flex → regex match)\n"
    "get_status · submit_patch  (not budgeted)\n"
    "3 graph tools: neighbors · similar · subgraph", "infra", body_size=8.3)

arrow(ax, (0.21, 0.415), (0.26, 0.415), label="compile", ly=0.018)
arrow(ax, (0.48, 0.415), (0.53, 0.415), label="/v1 API", ly=0.018)
arrow(ax, (0.74, 0.43), (0.79, 0.43), label="tool calls", ly=0.018)
arrow(ax, (0.79, 0.40), (0.74, 0.40))
arrow(ax, (0.895, 0.30), (0.895, 0.23), label="agent_patch", lx=0.05)
fig.savefig("figures/fig_pipeline.png", bbox_inches="tight", facecolor="white")
plt.close(fig)

# ---------------------------------------------------------------- 2. timeline
fig, ax = plt.subplots(figsize=(11, 7.0), dpi=200)
ax.set_xlim(2020.75, 2027.05); ax.set_ylim(-0.35, 6.4); ax.axis("off")
lanes = [
    ("Benchmarks &\nevaluation", "bench", 5.4),
    ("Agent\nscaffolds", "arch", 3.85),
    ("Training &\ndata", "train", 2.3),
    ("Industry\nharnesses", "ind", 0.75),
]
for name, k, y in lanes:
    ax.plot([2021.4, 2026.95], [y, y], color=TINT[k], lw=14, solid_capstyle="round", zorder=0)
    ax.text(2021.3, y, name, fontsize=9, weight="bold", color=C[k], ha="right", va="center")
for yr in range(2022, 2027):
    ax.plot([yr, yr], [0.15, 5.9], color=LINE, lw=0.8, ls=(0, (2, 3)), zorder=0)
    ax.text(yr, 6.12, str(yr), fontsize=9, color=MUTED, ha="center", weight="bold")
ax.plot([2026.73, 2026.73], [0.15, 5.9], color=C["comp"], lw=1.6, zorder=1)
ax.text(2026.73, 6.02, "This\ncompetition", fontsize=7.8, color=C["comp"], ha="center",
        weight="bold")

events = [
    ("bench", 2021.6, "HumanEval", 1), ("bench", 2023.8, "SWE-bench", 1),
    ("bench", 2024.62, "SWE-bench\nVerified", -1), ("bench", 2025.4, "SWE-rebench", 1),
    ("bench", 2025.72, "SWE-bench Pro", -1), ("bench", 2026.05, "contamination\ncritiques", 1),
    ("arch", 2022.8, "ReAct", 1), ("arch", 2023.25, "Reflexion", -1),
    ("arch", 2024.25, "AutoCodeRover", -1), ("arch", 2024.35, "SWE-agent\n(ACI)", 1),
    ("arch", 2024.55, "Agentless", -2), ("arch", 2024.62, "OpenHands /\nCodeAct", 2),
    ("arch", 2025.1, "CodeMonkeys", 1), ("arch", 2025.5, "mini-swe-agent\n(bash only)", -1),
    ("train", 2021.6, "LoRA", 1), ("train", 2023.4, "QLoRA", -1),
    ("train", 2024.98, "SWE-Gym", 1), ("train", 2025.15, "SWE-RL", -1),
    ("train", 2025.3, "R2E-Gym ·\nSWE-smith", 2), ("train", 2025.52, "DeepSWE", -2),
    ("train", 2025.73, "Kimi-Dev", 1), ("train", 2026.15, "SWE-Protégé", -1),
    ("train", 2026.46, "Open-SWE-\nTraces", 1), ("train", 2026.62, "outcome-only\nRL", -2),
    ("ind", 2024.95, "Building\neffective agents", -1), ("ind", 2025.06, "3.5 Sonnet\non SWE-bench", 1),
    ("ind", 2025.38, "Codex ·\nClaude Code", -2), ("ind", 2025.72, "context eng. ·\ntools · skills", -1),
    ("ind", 2026.05, "Codex agent\nloop", 1), ("ind", 2026.25, "harness\nengineering", -2),
]
lane_y = {k: y for _, k, y in lanes}
for k, x, label, side in events:
    y = lane_y[k]
    ax.scatter([x], [y], s=46, color=C[k], zorder=3, edgecolor="white", linewidth=1.2)
    off = (0.2 if abs(side) == 1 else 0.62) * (1 if side > 0 else -1)
    ax.plot([x, x], [y, y + off * 0.8], color=C[k], lw=0.8, zorder=2)
    ax.text(x, y + off, label, fontsize=7.2, color=INK, ha="center",
            va="bottom" if side > 0 else "top", linespacing=1.15)
fig.savefig("figures/fig_timeline.png", bbox_inches="tight", facecolor="white")
plt.close(fig)

# ---------------------------------------------------------------- 3. candidate architecture
fig, ax = plt.subplots(figsize=(11, 3.4), dpi=200)
ax.set_xlim(-0.012, 1.012); ax.set_ylim(0.04, 0.40); ax.axis("off")
stages = [
    ("Localize", "read-only tools\ngraph + grep\n→ output_key:\n   suspects", "arch", "LoRA-A (opt.)"),
    ("Reproduce", "write repro in /tmp\nrun_command\n→ output_key:\n   repro_cmd", "bench", "base model"),
    ("Patch", "edit_file on\nsuspect files only\nminimal diff,\nno test edits", "train", "LoRA-B (opt.)"),
    ("Verify", "rerun repro +\nnearby tests\nfix or roll back\n(LoopAgent ≤ N)", "comp", "base model"),
    ("Submit", "git diff sanity\ncheck: no stray\nfiles, no\npytest.ini edits", "ind", "—"),
]
w, gap, x0, y0, h = 0.17, 0.0375, 0.0, 0.1, 0.2
for i, (t, b, k, lora) in enumerate(stages):
    x = x0 + i * (w + gap)
    box(ax, x, y0, w, h, f"{i+1}  {t}", b, k, title_size=11, body_size=8.6)
    ax.text(x + w / 2, y0 - 0.03, lora, fontsize=7.8, color=MUTED, ha="center", style="italic")
    if i < len(stages) - 1:
        arrow(ax, (x + w, y0 + h / 2), (x + w + gap, y0 + h / 2))
ax.add_patch(FancyArrowPatch((3 * (w + gap) + w / 2, y0 + h), (2 * (w + gap) + w / 2, y0 + h),
                             connectionstyle="arc3,rad=0.45", arrowstyle="-|>", mutation_scale=12,
                             lw=1.2, color=C["comp"], ls="--"))
ax.text(2.5 * (w + gap) + w / 2, y0 + h + 0.065, "retry if repro still fails", fontsize=8, color=C["comp"],
        ha="center", style="italic")
fig.savefig("figures/fig_architecture.png", bbox_inches="tight", facecolor="white")
plt.close(fig)
print("ok")
