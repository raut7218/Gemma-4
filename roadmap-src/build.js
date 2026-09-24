const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, ExternalHyperlink, PositionalTab, PositionalTabAlignment,
  PositionalTabRelativeTo, PositionalTabLeader, TableLayoutType, HeightRule,
} = require("docx");
const READINGS = require("./readings");

// ------------------------------------------------------------------ tokens
const NAVY = "1B2A4A", GOLD = "B8862F", INK = "1F2937", MUTED = "64748B", RULE = "D6DCE5",
  CREAM = "F8F5EE", NOTE = "FBFAF6", WHITE = "FFFFFF", LINK = "1D4ED8";
const HEAD = "Georgia", BODY = "Calibri";
const TYPES = {
  comp:  { short: "Competition", label: "Competition spec",        color: "0F766E", tint: "E6F4F2" },
  bench: { short: "Benchmark", label: "Benchmark & evaluation",  color: "B91C1C", tint: "FBEAEA" },
  arch:  { short: "Architecture", label: "Agent architecture",      color: "1D4ED8", tint: "E8EEFC" },
  train: { short: "Training", label: "Training & data",         color: "C2410C", tint: "FCEEE6" },
  ind:   { short: "Industry blog", label: "Industry engineering blog", color: "7C3AED", tint: "F1EAFD" },
  infra: { short: "Model & serving", label: "Model & serving",         color: "475569", tint: "EEF1F5" },
  found: { short: "Foundations", label: "Foundations",             color: "15803D", tint: "E7F4EC" },
};
const PRI = [
  { tag: "P0", label: "Read first", fill: NAVY, text: WHITE, when: "Week 1" },
  { tag: "P1", label: "Core methods", fill: GOLD, text: WHITE, when: "Weeks 2–4" },
  { tag: "P2", label: "Deepen", fill: "94A3B8", text: WHITE, when: "Weeks 4–6" },
  { tag: "P3", label: "Horizon", fill: "E2E8F0", text: NAVY, when: "Optional" },
];

// A4, 2.1 cm margins
const PAGE_W = 11906, MARGIN = 1190, W = PAGE_W - 2 * MARGIN; // 9526

// ------------------------------------------------------------------ text helpers
// **bold**, `code`, _italic_
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|~[^~]+~)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), ...base, bold: true }));
    else if (t.startsWith("`")) out.push(new TextRun({ text: t.slice(1, -1), ...base, font: "Consolas", size: (base.size || 21) - 2, color: base.color || "0F172A" }));
    else out.push(new TextRun({ text: t.slice(1, -1), ...base, italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (text, o = {}) => new Paragraph({
  children: typeof text === "string" ? runs(text, o.run || {}) : text,
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: o.line ?? 288 },
  alignment: o.align, keepNext: o.keepNext, indent: o.indent, border: o.border,
  shading: o.shading, pageBreakBefore: o.pageBreakBefore,
});
const H1 = (num, text, kicker) => [
  new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: true, keepNext: true,
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: num, color: GOLD }), new TextRun({ text: "   " + text })],
  }),
  new Paragraph({
    keepNext: true, spacing: { after: 280 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 8 } },
    children: [new TextRun({ text: kicker, italics: true, color: MUTED, size: 22, font: HEAD })],
  }),
];
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun(text)] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, children: [new TextRun(text)] });
const bullet = (text, lvl = 0) => new Paragraph({
  numbering: { reference: "bullets", level: lvl }, children: runs(text),
  spacing: { after: 70, line: 280 },
});
const numbered = (text, ref = "steps") => new Paragraph({
  numbering: { reference: ref, level: 0 }, children: runs(text), spacing: { after: 80, line: 280 },
});
const link = (url, size = 18) => new ExternalHyperlink({
  link: url, children: [new TextRun({ text: url, style: "Hyperlink", size, color: LINK })],
});

// ------------------------------------------------------------------ table helpers
const NONE = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const thin = (c = RULE, s = 4) => ({ style: BorderStyle.SINGLE, size: s, color: c });
function cell(children, o = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: o.m ?? { top: 90, bottom: 90, left: 140, right: 140 },
    verticalAlign: o.va ?? VerticalAlign.TOP,
    borders: o.borders, rowSpan: o.rowSpan, columnSpan: o.span,
  });
}
function callout(title, bodyParas, color = GOLD, fill = CREAM) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: noBorders,
    rows: [new TableRow({ cantSplit: true, children: [cell([
      new Paragraph({ keepNext: true, spacing: { after: 80 }, children: [new TextRun({ text: title.toUpperCase(), bold: true, color, size: 18, characterSpacing: 30 })] }),
      ...bodyParas,
    ], { w: W, fill, m: { top: 160, bottom: 140, left: 260, right: 220 },
      borders: { left: { style: BorderStyle.SINGLE, size: 36, color }, top: NONE, bottom: NONE, right: NONE } })] })],
  });
}
const gap = (after = 160) => new Paragraph({ spacing: { after, before: 0 }, children: [] });

function dataTable(headers, rows, widths, o = {}) {
  const hdr = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((h, i) => cell(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: h, bold: true, color: WHITE, size: 18, characterSpacing: 10 })] }),
      { w: widths[i], fill: o.head || NAVY, m: { top: 80, bottom: 80, left: 120, right: 120 } })),
  });
  const body = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((c, i) => {
      const isObj = c && typeof c === "object" && !Array.isArray(c) && c.text !== undefined;
      const text = isObj ? c.text : c;
      const paras = (Array.isArray(text) ? text : [text]).map((t) =>
        t instanceof Paragraph ? t : new Paragraph({ spacing: { after: 30, line: 264 }, children: runs(String(t), { size: 19, color: isObj && c.color ? c.color : INK, bold: isObj && c.bold }) }));
      return cell(paras, { w: widths[i], fill: isObj && c.fill ? c.fill : (ri % 2 ? "F8FAFC" : WHITE), m: { top: 70, bottom: 70, left: 120, right: 120 } });
    }),
  }));
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    borders: { top: thin(), bottom: thin(), left: NONE, right: NONE, insideHorizontal: thin("E5E9F0"), insideVertical: NONE },
    rows: [hdr, ...body],
  });
}
function figure(file, px, caption) {
  const [pw, ph] = px;
  const wIn = W / 1440, wPx = Math.round(wIn * 96), hPx = Math.round(wPx * ph / pw);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(file), transformation: { width: wPx, height: hPx },
        altText: { title: caption, description: caption, name: file } })] }),
    new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.LEFT,
      children: runs(caption, { size: 18, color: MUTED, italics: true }) }),
  ];
}
function typeChip(key, size = 16) {
  const t = TYPES[key];
  return [new TextRun({ text: "■ ", color: t.color, size }), new TextRun({ text: t.label.toUpperCase(), color: t.color, bold: true, size, characterSpacing: 20 })];
}

// ------------------------------------------------------------------ reading card
function card(r) {
  const t = TYPES[r.type], p = PRI[r.pri];
  const STRIP = 150, BODYW = W - STRIP;
  const labelled = (label, text) => new Paragraph({
    spacing: { after: 70, line: 276 },
    children: [new TextRun({ text: label + "   ", bold: true, color: t.color, size: 16, characterSpacing: 20 }), ...runs(text, { size: 20, color: INK })],
  });
  const tab = () => new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE })] });
  const pad = { left: 200, right: 180 };
  const lineRow = () => new TableRow({ height: { value: 380, rule: HeightRule.EXACT }, children: [cell(new Paragraph({ spacing: { after: 0 }, children: [] }),
    { w: BODYW, fill: NOTE, m: { top: 0, bottom: 0, ...pad }, borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "C0C7D1" }, top: NONE, left: NONE, right: NONE } })] });
  const inner = new Table({
    width: { size: BODYW, type: WidthType.DXA }, columnWidths: [BODYW], borders: noBorders,
    rows: [
      new TableRow({ children: [cell([
        new Paragraph({ spacing: { after: 50 }, children: [
          new TextRun({ text: r.id, bold: true, color: NAVY, size: 18, font: HEAD }),
          new TextRun({ text: "   ", size: 16 }), ...typeChip(r.type), new TextRun({ text: "      ", size: 16 }),
          new TextRun({ text: ` ${p.tag} · ${p.label.toUpperCase()} `, bold: true, color: p.text, size: 15, shading: { type: ShadingType.CLEAR, fill: p.fill, color: "auto" }, characterSpacing: 20 }),
          new TextRun({ text: `   ≈ ${r.mins} min`, color: MUTED, size: 16 }),
        ] }),
        new Paragraph({ spacing: { after: 40, line: 264 }, children: [new TextRun({ text: r.title, bold: true, font: HEAD, size: 25, color: INK })] }),
        new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: r.meta, color: MUTED, size: 17 })] }),
        new Paragraph({ spacing: { after: 20 }, children: [link(r.url, 16)] }),
      ], { w: BODYW, fill: t.tint, m: { top: 120, bottom: 110, ...pad } })] }),
      new TableRow({ children: [cell([labelled("WHY READ", r.why), labelled("KEY TAKEAWAY", r.take), labelled("READ FOR", r.focus)],
        { w: BODYW, m: { top: 120, bottom: 60, ...pad } })] }),
      new TableRow({ children: [cell(new Paragraph({ spacing: { after: 0 }, children: [
          new TextRun({ text: "MY NOTES", bold: true, color: MUTED, size: 15, characterSpacing: 30 }), new TextRun({ text: "          ", size: 16 }),
          new TextRun({ text: "☐ Skimmed    ☐ Read    ☐ Applied    Date ________", color: MUTED, size: 16 }),
        ] }), { w: BODYW, fill: NOTE, m: { top: 90, bottom: 20, ...pad }, borders: { top: { style: BorderStyle.DASHED, size: 4, color: RULE }, bottom: NONE, left: NONE, right: NONE } })] }),
      lineRow(), lineRow(), lineRow(),
      new TableRow({ height: { value: 140, rule: HeightRule.EXACT }, children: [cell(new Paragraph({ spacing: { after: 0 }, children: [] }), { w: BODYW, fill: NOTE, m: { top: 0, bottom: 0, left: 0, right: 0 } })] }),
    ],
  });
  return [
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [STRIP, BODYW],
      borders: { top: thin(), bottom: thin(), left: NONE, right: thin(), insideHorizontal: NONE, insideVertical: NONE },
      rows: [new TableRow({ cantSplit: true, children: [
        cell(new Paragraph({ children: [] }), { w: STRIP, fill: t.color, m: { top: 0, bottom: 0, left: 0, right: 0 } }),
        cell([inner, new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: "", size: 2 })] })], { w: BODYW, m: { top: 0, bottom: 0, left: 0, right: 0 } }),
      ] })] }),
    gap(220),
  ];
}
function tierIntro(pri, blurb) {
  const p = PRI[pri];
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [1500, W - 1500], borders: noBorders,
    rows: [new TableRow({ cantSplit: true, children: [
      cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
        new TextRun({ text: p.tag, bold: true, color: p.text, size: 40, font: HEAD }),
        new TextRun({ text: p.when.toUpperCase(), color: p.text, size: 14, break: 1, characterSpacing: 20 }),
      ] }), { w: 1500, fill: p.fill, va: VerticalAlign.CENTER, m: { top: 140, bottom: 140, left: 80, right: 80 } }),
      cell([
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: p.label, bold: true, font: HEAD, size: 28, color: NAVY })] }),
        new Paragraph({ spacing: { after: 0, line: 276 }, children: runs(blurb, { size: 20, color: INK }) }),
      ], { w: W - 1500, fill: CREAM, va: VerticalAlign.CENTER, m: { top: 140, bottom: 140, left: 260, right: 200 } }),
    ] })],
  });
}

// ================================================================== CONTENT
const C = [];

// ------------------------------------------------------------------ COVER
const factCell = (k, v, w) => cell([
  new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: k.toUpperCase(), bold: true, color: GOLD, size: 15, characterSpacing: 30 })] }),
  new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(v, { size: 20, color: INK }) }),
], { w, fill: CREAM, m: { top: 150, bottom: 150, left: 180, right: 160 }, borders: { top: NONE, bottom: NONE, left: NONE, right: { style: BorderStyle.SINGLE, size: 12, color: WHITE } } });
const cw = Math.floor(W / 3), cwl = W - 2 * cw;
C.push(
  new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W], borders: noBorders,
    rows: [new TableRow({ height: { value: 7000, rule: HeightRule.ATLEAST }, children: [cell([
      new Paragraph({ spacing: { before: 400, after: 500 }, children: [new TextRun({ text: "RESEARCH ROADMAP  ·  LITERATURE REVIEW  ·  READING GUIDE", color: "D4B06A", bold: true, size: 17, characterSpacing: 60 })] }),
      new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "The Gemma 4", font: HEAD, size: 76, color: WHITE })] }),
      new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: "Developer Agent", font: HEAD, size: 76, color: WHITE, bold: true })] }),
      new Paragraph({ spacing: { after: 120, line: 300 }, border: { top: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 14 } },
        children: [new TextRun({ text: "What the competition asks, how coding agents got here, where the state of the art is today, and 50 annotated readings ranked by what to read first.", color: "D9DEE8", size: 25, font: HEAD, italics: true })] }),
      new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "Prepared 24 September 2026  ·  Competition window 23 Sep – 2 Dec 2026", color: "AAB4C5", size: 18 })] }),
    ], { w: W, fill: NAVY, m: { top: 300, bottom: 300, left: 560, right: 560 } })] })],
  }),
  gap(200),
  new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [cw, cw, cwl], borders: noBorders,
    rows: [
      new TableRow({ cantSplit: true, children: [
        factCell("The task", "Post-train and configure Gemma 4 into an **offline agent that fixes real GitHub issues**", cw),
        factCell("The metric", "**Resolution rate**: share of hidden tasks where the patch makes the hidden tests pass", cw),
        factCell("The model", "`gemma-4-31b-it-qat-w4a16-ct` only, plus up to 8 LoRA adapters", cwl),
      ] }),
      new TableRow({ cantSplit: true, children: [
        factCell("The hardware", "4 × NVIDIA L4 (96 GB) via vLLM · **32,768-token** context", cw),
        factCell("The budget", "**12 hours** for about 120 hidden tasks from private repos", cw),
        factCell("The deadlines", "Paper track **12 Nov** · Team merge **25 Nov** · Final **2 Dec 2026**", cwl),
      ] }),
    ],
  }),
  gap(220),
  new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: "COLOUR KEY: STUDY TYPE", bold: true, color: MUTED, size: 15, characterSpacing: 40 })] }),
  (() => { const ks = Object.keys(TYPES); const w0 = Math.floor(W / ks.length); const ws = ks.map((_, i) => i === ks.length - 1 ? W - w0 * (ks.length - 1) : w0);
    return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ws, borders: noBorders,
      rows: [new TableRow({ cantSplit: true, children: ks.map((k, i) => cell(new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: TYPES[k].label, bold: true, color: TYPES[k].color, size: 16 })] }),
        { w: ws[i], fill: TYPES[k].tint, m: { top: 90, bottom: 90, left: 100, right: 80 }, borders: { top: { style: BorderStyle.SINGLE, size: 24, color: TYPES[k].color }, bottom: NONE, left: NONE, right: { style: BorderStyle.SINGLE, size: 12, color: WHITE } } })) })] }); })(),
  new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "PRIORITY TIERS", bold: true, color: MUTED, size: 15, characterSpacing: 40 })] }),
  new Paragraph({ spacing: { after: 0 }, children: PRI.flatMap((p) => [
    new TextRun({ text: ` ${p.tag} `, bold: true, color: p.text, size: 16, shading: { type: ShadingType.CLEAR, fill: p.fill, color: "auto" } }),
    new TextRun({ text: `  ${p.label} · ${p.when}        `, size: 16, color: INK }),
  ]) }),
);

// ------------------------------------------------------------------ 0. HOW TO USE
C.push(...H1("00", "How to use this roadmap", "A map of the document, the colour code, and the anatomy of a reading card"));
C.push(P("This document has two jobs. **Sections 1–5** explain the competition and the field: what is being scored, what the data looks like, which agent architectures exist, how they evolved over five years, and what the 2026 state of the art looks like once it is squeezed onto a single 31B model with a 32k window. **Section 6** is the reading guide itself: 50 items, each ranked by priority and colour-coded by study type, with room for your notes. **Sections 7–8** turn the reading into a six-week plan and a shortlist of research questions for the paper track."));
C.push(dataTable(["§", "Section", "What you get from it"], [
  ["1", "The problem in detail", "Scoring pipeline, submission format, tools, budgets, and the constraints that decide strategy"],
  ["2", "The dataset and where to focus", "What the 129 public tasks look like, how the hidden set differs, and a ranked list of levers"],
  ["3", "Existing system architectures", "Six families of SWE agents, compared on fit for this competition"],
  ["4", "How they evolved (2021–2026)", "Timeline and five eras: from HumanEval to trained, harness-aware agents"],
  ["5", "The current architecture and how it maps here", "Frontier practice set against each constraint here, plus a candidate design"],
  ["6", "The reading guide", "Tracker table, then annotated cards by tier P0 → P3"],
  ["7", "Six-week plan", "Reading and experiments mapped to the calendar and deadlines"],
  ["8", "Research questions", "Six paper-track hypotheses the reading sets up"],
  ["A–C", "Appendices", "Glossary, lined notes pages, sources and caveats"],
], [700, 3200, W - 3900]));
C.push(gap(240));
C.push(H2("The colour code"));
C.push(P("Every reading carries one **study type**, shown as the coloured strip on its card and the colour of its label everywhere else. Types answer the question “what kind of evidence is this?”"));
C.push(dataTable(["Type", "What it is", "How to read it"], [
  [{ text: "Competition spec", color: TYPES.comp.color, bold: true, fill: TYPES.comp.tint }, "Official rules and harness docs, and participant code", "Treat it as ground truth and re-read it often"],
  [{ text: "Benchmark & evaluation", color: TYPES.bench.color, bold: true, fill: TYPES.bench.tint }, "How tasks are built and scored, plus critiques", "Look at task construction and failure modes"],
  [{ text: "Agent architecture", color: TYPES.arch.color, bold: true, fill: TYPES.arch.tint }, "Scaffolds, workflows, search and tool design", "Ask whether it can be expressed in agent.yaml"],
  [{ text: "Training & data", color: TYPES.train.color, bold: true, fill: TYPES.train.tint }, "SFT, RL, synthetic environments, trajectory corpora", "Ask whether it's feasible with LoRA and free GPUs"],
  [{ text: "Industry engineering blog", color: TYPES.ind.color, bold: true, fill: TYPES.ind.tint }, "Anthropic, OpenAI and Google practitioner write-ups", "Copy the recipes, then check they hold at 31B"],
  [{ text: "Model & serving", color: TYPES.infra.color, bold: true, fill: TYPES.infra.tint }, "Gemma 4, ADK, vLLM, LoRA mechanics", "Check the constraints before running experiments"],
  [{ text: "Foundations", color: TYPES.found.color, bold: true, fill: TYPES.found.tint }, "Seminal ideas that everything above builds on", "Read for vocabulary and skip the experiments"],
], [2500, 3700, W - 6200]));
C.push(gap(240));
C.push(H2("Priority tiers"));
C.push(P("**P0 · Read first** (11 items, about 7 hours) is the minimum needed to make sensible decisions this week. **P1 · Core methods** (13 items) covers the techniques you'll most likely use. **P2 · Deepen** (16 items) fills in alternatives and the related work you'll need for the paper track. **P3 · Horizon** (10 items) is optional reading, listed compactly in a table."));
C.push(callout("Anatomy of a reading card", [
  bullet("**Colour strip and type label**: the kind of study it is."),
  bullet("**ID, priority badge and time estimate**: R-numbers match the tracker table and the plan in §7."),
  bullet("**Why read / Key takeaway / Read for**: why it matters ~for this competition~, what to remember, and which parts to read."),
  bullet("**My notes**: tick boxes for status and ruled lines for notes. Appendix B has more lined pages."),
]));

// ------------------------------------------------------------------ 1. PROBLEM
C.push(...H1("01", "The problem in detail", "Build an agent that fixes real bugs offline, on everyday hardware, with one open model"));
C.push(callout("In one paragraph", [P("You receive a GitHub-style **issue description** and a Python repository checked out at the commit before the fix. Your agent, which is Gemma 4 31B (INT4) running inside Google's Agent Development Kit, can only read files, edit files, run shell commands and query a code graph in an **offline sandbox**. It must leave behind a **git diff**. A separate clean container applies that diff, adds **hidden tests** written by the original developers, and runs pytest. If pytest exits 0 the task counts as resolved. Your score is the fraction of about **120 hidden tasks from private repositories** you resolve, all within a **12-hour** cap. You don't submit code. You submit a **declarative bundle**: YAML agent configs, prompts, skills and optional **LoRA adapters**.", { after: 0, run: { size: 21 } })]));
C.push(gap(200));
C.push(H2("1.1  Competition facts"));
C.push(dataTable(["Item", "Detail"], [
  ["Host", "Google (Gemma team) on Kaggle: “Google – The Gemma 4 Developer Agent Competition”, with a separate **Paper Track** competition"],
  ["Goal (organizers' words)", "“Post-train an open model into a reliable agent that navigates complex codebases and drafts fixes for real software issues, accelerating developer workflows on everyday hardware.”"],
  ["Timeline (23:59 UTC)", "Start **23 Sep 2026** · Paper track deadline **12 Nov** · Entry and team-merger deadline **25 Nov** · Final submission **2 Dec 2026**"],
  ["Prizes", "Main: $37k / $18k / $10k for places 1–3. Paper track: separate pool (reported as $35k) with a Google-hosted showcase. Winners must open-source code and adapters and write up a reproducible solution"],
  ["Submissions", "1 per day · 2 final selections · teams of up to 5"],
  ["External data and models", "Allowed if freely accessible to everyone (a “reasonableness” standard). Whether distillation from proprietary APIs is allowed was still an open forum question at launch"],
  ["Leaderboard", "Hidden set of about 120 tasks, split 50/50 between the public and private leaderboards"],
], [2400, W - 2400]));
C.push(gap(240));
C.push(H2("1.2  How a submission is scored"));
C.push(...figure("figures/fig_pipeline.png", [1745, 871], "Figure 1. The two-container evaluation lifecycle. Container A is where your agent works; Container B verifies the diff it leaves behind. Source: organizers' harness guide (R01)."));
C.push(numbered("**Compile.** Your YAML is validated and compiled into an ADK agent tree. No Python entry points are allowed, and every agent must declare the same base model."));
C.push(numbered("**Serve.** vLLM hosts the INT4 31B model on 4 L4 GPUs with `max_model_len = 32768`, Gemma 4 tool-call and reasoning parsers, and up to 8 LoRA adapters of rank ≤ 128."));
C.push(numbered("**Prepare Container A.** The repo snapshot has no git history after `base_commit`. Dependencies are preinstalled and the network is off. The harness commits its own `pytest.ini` and `conftest.py` as the baseline."));
C.push(numbered("**Run the agent loop.** The first message contains the problem statement, hints if any, the budget, environment rules, the tool notes and a 150-entry directory listing. The loop runs until `submit_patch()`, the budget runs out, or 3 turns in a row pass without a tool call."));
C.push(numbered("**Extract the patch.** `git add -N . && git diff HEAD`. This happens even if the agent never calls submit, so a half-finished edit still gets graded."));
C.push(numbered("**Verify in Container B.** Apply the patch, **reset any test files the hidden test patch touches** (so editing tests achieves nothing), apply the hidden tests, and run pytest on the targets. Exit code 0 means resolved."));
C.push(gap(120));
C.push(H2("1.3  What you submit"));
C.push(dataTable(["Path", "Purpose", "Notes"], [
  ["`agent.yaml`", "Root agent (required)", "LlmAgent by default. Can also be SequentialAgent, ParallelAgent or LoopAgent"],
  ["`prompts/*.md`", "Instructions, loaded via `!include`", "`{problem_description}` and `{hints}` are filled in from session state"],
  ["`configs/sampling.yaml`", "Generation config", "temperature, top_p/k, max_output_tokens (≤ 32,768), thinking_level (NONE…HIGH), thinking_budget"],
  ["`sub_agents/*.yaml`", "Sub-agents or AgentTools", "Each can have its own prompt, tools, adapter and output_key"],
  ["`skills/<name>/SKILL.md`", "ADK skills and scripts", "Scripts run in the sandbox and each run costs one tool call"],
  ["`adapters/<name>/`", "PEFT LoRA weights", "safetensors only · rank ≤ 128 · at most 8 · whole bundle < 3 GiB"],
  ["`eval_config.yaml`", "Per-task budgets", "timeout_seconds, max_tool_calls, max_time_minutes, max_turns. **This is a strategic lever**"],
], [2300, 2300, W - 4600]));
C.push(gap(240));
C.push(H2("1.4  The agent's working environment"));
C.push(dataTable(["Tool", "Budgeted", "Behaviour that matters"], [
  ["`run_command`", "yes", "bash in /workspace · timeout min(300 s, time remaining) · stdout and stderr each cut to 5,000 chars"],
  ["`read_file`", "yes", "1-indexed, inclusive line ranges · at most 150 lines and 10,000 chars · reports `is_truncated`"],
  ["`edit_file`", "yes", "Tries exact, then whitespace-flexible, then regex-tokenised matching · errors on 0 or >1 matches unless `allow_multiple`"],
  ["`write_file`", "yes", "Creates or overwrites · files it creates under /workspace **end up in your patch**"],
  ["`get_status`", "no", "Tool calls, time and turns remaining, and patch status"],
  ["`submit_patch`", "no", "Captures the diff and ends the session after the current turn"],
  ["`get_code_neighbors`", "yes", "Callers, callees and definitions of a symbol (4-tier name resolution)"],
  ["`search_similar_code`", "yes", "Query must be a **symbol name**, not a sentence. A community report says the embeddings barely discriminate between symbols"],
  ["`get_code_subgraph`", "yes", "Induced subgraph over a list of symbols"],
], [2300, 1150, W - 3450]));
C.push(gap(160));
C.push(P("**Sandbox:** python 3.13-slim, 4 GiB RAM, 2 vCPU, offline, with pytest available. **Context management:** ADK compacts events every 15 events (overlap 2, keeps 5), and the context cache minimum is 2,048 tokens. **Nudges:** there are three canned continuation messages, including specific ones for a truncated tool call and for hitting MAX_TOKENS while thinking."));
C.push(gap(80));
C.push(H2("1.5  Constraints that decide strategy"));
C.push(callout("Implications worth writing on a sticky note", [
  bullet("**About 6 minutes per task if tasks run one at a time.** 12 hours for about 120 tasks leaves roughly 6 minutes each unless the organizers run tasks in parallel (not yet documented). Budget allocation in `eval_config.yaml` is a first-order decision."),
  bullet("**32k tokens covers everything.** Prompt, history, thinking and output all share one window. A 4,096-token thinking budget per turn uses it up fast, and compaction will drop early observations."),
  bullet("**Binary reward.** A patch that is almost right scores zero. The agent has to verify its fix, which in practice means writing its own reproduction, since the hidden tests are never shown."),
  bullet("**Generalisation beats memorisation.** The hidden tasks come from ~private~ repos, so skills and prompts tuned to fastapi or rich may not transfer."),
  bullet("**Patch hygiene.** Scratch files belong in /tmp. Don't touch `pytest.ini` or `conftest.py`. Editing test files is pointless because they're reset before verification."),
  bullet("**One submission a day.** That's about 70 leaderboard probes in total, so a faithful local evaluation loop is essential."),
], NAVY, "EEF1F7"));
C.push(gap(200));
C.push(H2("1.6  Known unknowns at launch"));
C.push(bullet("The official evaluator packages (`swegemma`, `adk-submission`, `adk-eval-core`) are unpublished, so local re-implementations may differ from the real thing."));
C.push(bullet("How many tasks the organizers run concurrently inside the 12-hour cap."));
C.push(bullet("Whether trajectories distilled from proprietary models are allowed as training data. Plan for a “Gemma-only / open-data” pipeline to be safe."));
C.push(bullet("How stable LoRA is on the compressed-tensors W4A16 build in vLLM. There's a community report of high-rank, all-layer adapters misbehaving."));

// ------------------------------------------------------------------ 2. DATASET
C.push(...H1("02", "The dataset and where to focus", "129 public tasks, about 120 hidden ones, and the levers that move the score"));
C.push(H2("2.1  What's in the public data"));
C.push(dataTable(["Repository", "Tasks", "Share", "Character"], [
  ["fastapi", "67", "52%", "Web framework; routing, dependency injection, pydantic validation"],
  ["rich", "48", "37%", "Terminal rendering; string and ANSI output assertions"],
  ["requests", "13", "10%", "HTTP client; several tests need a network that doesn't exist offline"],
  ["httpx", "1", "1%", "HTTP client"],
  [{ text: "Total", bold: true }, { text: "129", bold: true }, "100%", "Median reference fix: **31 lines in 1 file** · no hints text · about 20.5 GB of repo snapshots"],
], [1800, 900, 900, W - 3600]));
C.push(gap(160));
C.push(P("Tasks were mined automatically from repository histories. Commits were kept only if they changed core `.py` logic **and** the matching unit tests (`test_*.py` or `*_test.py`), and then passed a **two-phase verification**: the tests fail before the fix and pass after it. Each task gives you: `problem_statement`, `base_commit`, repository snapshot, `test_patch` (hidden at evaluation), the gold patch (training only), and pre-computed **code-graph and embedding files** (`.json` / `.npz`). A community audit found that about half the graph and embedding files are 0 bytes because of how hard links were stored, but 128 of 129 tasks still have usable data under one of the two file names."));
C.push(H2("2.2  How the hidden set differs"));
C.push(dataTable(["", "Public training set", "Hidden test set"], [
  ["Size", "129 tasks", "About 120 tasks (half on the public leaderboard, half on the private one)"],
  ["Repositories", "4 well-known open-source repos", "**Private repositories**, so the model can't have memorised them"],
  ["Gold patch visible", "Yes", "No"],
  ["Curation", "Automated commit mining and two-phase verification", "Same pipeline, so expect similar size and style (small, single-file fixes)"],
  ["Risk", "Easy to overfit prompts and skills to fastapi idioms", "The score rewards general repo navigation and self-verification"],
], [1800, 3400, W - 5200]));
C.push(gap(200));
C.push(H2("2.3  Where to focus: levers ranked by expected return"));
C.push(P("The ranking reflects likely return per hour of effort, based on how the harness works and what the literature shows. Treat it as a hypothesis to test against your own measurements."));
C.push(dataTable(["#", "Lever", "Why it matters", "First experiment", "Read"], [
  ["1", "**Local eval fidelity**", "You get one leaderboard probe a day, so you need an offline copy you trust", "Run gold and null patches on all 129 tasks and match the harness", "R01 R02"],
  ["2", "**Budget and termination policy**", "The starter config (1 minute, 10 calls) caps the score near zero, and every task must end in a diff", "Sweep time, tool-call and turn limits in eval_config.yaml", "R01 R28"],
  ["3", "**Prompt and workflow**", "The model has to explore, reproduce, fix, verify and submit, in that order", "Port the R06 prompt, then A/B test it against an Agentless-style SequentialAgent", "R05 R06 R08"],
  ["4", "**Thinking vs context**", "Thinking tokens compete with observations in a 32k window", "Compare thinking_level NONE, LOW and HIGH, and the thinking budget", "R09 R11"],
  ["5", "**Failure taxonomy**", "Looping, never submitting, wrong file, patch that won't apply, over-editing", "Label 50 failed trajectories by hand", "R21 R44"],
  ["6", "**LoRA SFT on verified trajectories**", "It can teach tool discipline and stop looping, and it's cheap with rejection sampling", "Collect Gemma's own passing runs and train a rank-16 LoRA on a subset of layers", "R15 R16 R23"],
  ["7", "**More training tasks**", "129 tasks from 4 repos is too few and too narrow", "SWE-smith-style bug injection into other Python repos", "R16 R17 R39"],
  ["8", "**Test-time scaling**", "Several attempts plus selection, if the time budget allows", "Two attempts and a judge, compared with one long attempt", "R17 R28 R30"],
  ["9", "**RL**", "Highest ceiling, highest cost, and small-pool RL tends to stall", "Only after SFT; follow the R22 recipe", "R18 R19 R22"],
], [450, 1900, 2750, 2926, 1500]));
C.push(gap(200));
C.push(callout("Suggested local split", [
  P("Hold out a whole repository for testing, not random tasks. For example, develop on fastapi and requests and test on rich, then rotate. Exclude the roughly 20 tasks whose gold patch fails locally for environment reasons. They'll only add noise. Report scores **per repo** so repo-specific overfitting shows up.", { after: 0 }),
], TYPES.comp.color, TYPES.comp.tint));

// ------------------------------------------------------------------ 3. ARCHITECTURES
C.push(...H1("03", "Existing system architectures", "Six families of software-engineering agents, and how each fits a 31B model in a declarative harness"));
C.push(H2("3.1  The anatomy every coding agent shares"));
C.push(P("Whatever the family, a coding agent is made of the same six parts. Families differ in **which part carries the intelligence**."));
C.push(dataTable(["Component", "Role", "In this competition"], [
  ["Model", "Decides what to do next", "Fixed: Gemma 4 31B INT4. You can change it only through LoRA"],
  ["Control flow (harness)", "Decides when the model is called and on what", "Declared in YAML with LlmAgent, Sequential, Loop and Parallel agents"],
  ["Action interface (ACI / tools)", "What the model can do", "Fixed set of 9 tools, plus skills and sub-agents you define"],
  ["Context manager", "What the model sees each turn", "32k window, ADK compaction, include_contents, output_key state"],
  ["Environment", "Where actions run", "Offline Docker container, 4 GiB RAM, 2 vCPU"],
  ["Verifier / selector", "Decides whether a candidate is good enough", "Nothing built in. You have to create it (reproduction script, judge sub-agent)"],
], [2400, 3100, W - 5500]));
C.push(gap(240));
C.push(H2("3.2  Six families"));
C.push(dataTable(["Family", "Control flow", "Examples", "Strength", "Weakness", "Fit here"], [
  [{ text: "A · Fixed workflow (agentless)", bold: true, color: TYPES.arch.color }, "Hard-coded stages: localize → repair → validate", "Agentless, Kimi-Dev (agentless mode)", "Predictable, cheap, robust with weaker models", "Can't adapt to surprises; relies on a good localizer", "**High**. Maps to SequentialAgent"],
  [{ text: "B · Tool-loop agent with a designed ACI", bold: true, color: TYPES.arch.color }, "ReAct loop over purpose-built tools", "SWE-agent, Claude Code, Codex", "Flexible, and scales with model strength", "Loops and drifts with weaker models", "**High**. The default LlmAgent"],
  [{ text: "C · Code-as-action", bold: true, color: TYPES.arch.color }, "Model writes code or bash as its actions", "CodeAct / OpenHands, mini-swe-agent", "Few tools, expressive actions", "Needs strong coding and a reliable shell", "**Medium**. Partly possible via run_command"],
  [{ text: "D · Structure-aware search", bold: true, color: TYPES.arch.color }, "AST or graph queries drive localization", "AutoCodeRover, graph-RAG agents", "Precise localization", "Tooling-heavy; weak embeddings hurt", "**Medium**. The graph tools exist but are unproven"],
  [{ text: "E · Test-time scaling", bold: true, color: TYPES.arch.color }, "Many attempts plus a verifier or selector", "CodeMonkeys, SWE-Gym verifiers, R2E-Gym, SWE-Search", "Converts compute into accuracy", "Costly in time; selection is hard", "**Budget-dependent**. Only if the 12 h cap allows"],
  [{ text: "F · Multi-agent / orchestrator", bold: true, color: TYPES.arch.color }, "Lead agent delegates to sub-agents with clean contexts", "Claude Code subagents, Anthropic research system", "Protects the main context and allows specialists", "Coordination overhead and lost detail", "**High**. AgentTool plus per-agent LoRA"],
], [1600, 1650, 1550, 1500, 1500, W - 7800]));
C.push(gap(200));
C.push(callout("Reading the table", [
  P("Families A, B and F are the practical core for this competition, and they combine well. A common pattern, used by Kimi-Dev and implied by Anthropic's advice, is a **workflow skeleton with agentic stages**: fixed stages, each run as a small tool loop, handing results forward through state. Family E is the stretch goal once per-task time is known.", { after: 0 }),
], TYPES.arch.color, TYPES.arch.tint));

// ------------------------------------------------------------------ 4. EVOLUTION
C.push(...H1("04", "How they evolved, 2021–2026", "From writing single functions to trained agents that run inside their own harness"));
C.push(...figure("figures/fig_timeline.png", [1801, 1118], "Figure 2. Reading-list items placed on four lanes. The broad arc: bigger scaffolds (2024) gave way to simpler harnesses around stronger, trajectory-trained models (2025–26)."));
const era = (label, years, color, body, reads) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [1900, W - 1900], borders: noBorders,
  rows: [new TableRow({ cantSplit: true, children: [
    cell([
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: years, bold: true, font: HEAD, size: 26, color })] }),
      new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 15, color: MUTED, characterSpacing: 20 })] }),
    ], { w: 1900, m: { top: 120, bottom: 120, left: 0, right: 160 }, borders: { right: { style: BorderStyle.SINGLE, size: 18, color } } }),
    cell([
      ...body.map((b) => new Paragraph({ spacing: { after: 70, line: 280 }, children: runs(b, { size: 20 }) })),
      new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Read: " + reads, size: 17, color: MUTED, italics: true })] }),
    ], { w: W - 1900, m: { top: 120, bottom: 160, left: 260, right: 80 } }),
  ] })],
});
C.push(era("Code LLMs", "2021–22", TYPES.found.color, [
  "Codex and HumanEval established **function-level** code generation and the pass@k metric. ReAct established the **reason → act → observe** loop for tool use. Agents at this stage were research demos, not software engineers.",
], "R49, R25"));
C.push(gap(80));
C.push(era("Repo-level reality check", "2023", TYPES.bench.color, [
  "**SWE-bench** moved evaluation from toy functions to real GitHub issues in large repos. Early retrieval-plus-generate baselines resolved only a few percent. Reflexion showed that written self-critique helps when there's a feedback signal.",
], "R03, R26"));
C.push(gap(80));
C.push(era("The scaffold era", "2024", TYPES.arch.color, [
  "Performance came from **engineering around the model**. SWE-agent's agent-computer interface, AutoCodeRover's AST search, OpenHands' code actions and sandboxed runtime, and **Agentless** showing that a fixed pipeline could match agents. SWE-bench Verified cleaned up the benchmark.",
], "R04, R27, R14, R08, R24"));
C.push(gap(80));
C.push(era("Simple harness, trained model", "2025", TYPES.train.color, [
  "Claude 3.5 Sonnet reached 49% on Verified with just **bash plus an edit tool**. Claude Code and Codex shipped as product harnesses, and Codex's model was **RL-trained inside its own sandbox**. mini-swe-agent showed 100 lines were enough for frontier models.",
  "Open research turned to **data and training**: SWE-Gym, SWE-smith and R2E-Gym built executable task factories; SWE-RL, DeepSWE and Kimi-Dev showed RL and staged SFT lifting open 32–72B models to about 40–60% on Verified; test-time scaling (CodeMonkeys, hybrid verifiers) added more.",
], "R06, R07, R37, R15–R20, R28"));
C.push(gap(80));
C.push(era("Harness & context engineering; small models", "2026", TYPES.ind.color, [
  "Practitioners reframed the work as **context engineering** and **harness engineering**: compaction, skills with progressive disclosure, progress files, and evaluation-driven tool design. Anthropic warned that “harnesses encode assumptions that go stale as models improve.”",
  "Research pushed **small open models**: selective-expert training against action looping (SWE-Protégé: 7B → 42%), outcome-only RL recipes that survive small task pools (CANOPY), and open trajectory corpora of 200k+ (Open-SWE-Traces). Contamination critiques moved evaluation towards **fresh or private repos**, which is exactly this competition's design.",
], "R09, R12, R35, R36, R41–R44, R21, R22, R32, R38"));
C.push(gap(200));
C.push(callout("The five-year arc in three sentences", [
  P("First the intelligence moved **out of the prompt and into the scaffold** (2024). Then it moved **out of the scaffold and into the weights**, as models were trained on agent trajectories inside the harness they would be used in (2025). This competition asks you to repeat that second step on a small scale: shape a 31B model and its harness together, under hard limits on context and time.", { after: 0, run: { size: 21 } }),
], GOLD));

// ------------------------------------------------------------------ 5. CURRENT ARCH
C.push(...H1("05", "The current architecture and how it maps here", "What frontier coding agents do in 2026, set against each limit of this competition"));
C.push(dataTable(["Component", "Frontier practice (Claude Code, Codex, 2025–26)", "Constraint here", "Adaptation to test"], [
  ["Model", "Large model RL-trained on agentic coding in its own harness", "31B INT4; LoRA only; no network", "SFT a LoRA on Gemma's own passing trajectories in the swegemma tool format"],
  ["Loop", "Single agent loop, with the model deciding when it's done", "Nudges, budgets and a 12 h cap", "One LlmAgent baseline, then a staged SequentialAgent variant"],
  ["Tools", "Few general tools (bash, edit, search) with carefully written descriptions", "9 fixed tools; descriptions not editable", "Put tool-usage guidance in the prompt and add skills for repeated procedures"],
  ["Context", "Compaction, sub-agents, memory files, just-in-time retrieval", "32k window; compaction every 15 events", "Short observations, a notes file in /tmp, and read-only sub-agents that return summaries"],
  ["Reasoning", "Adaptive thinking effort", "Thinking shares the 32k window", "Lower thinking level on tool turns; measure the MAX_TOKENS nudge rate"],
  ["Verification", "Run tests, write reproductions, self-review the diff", "Hidden tests; pytest is available", "Reproduction script in /tmp, run before and after the fix, plus nearby existing tests"],
  ["Knowledge", "AGENTS.md or CLAUDE.md files and skills", "Skills supported; scripts cost tool calls", "General skills (repo map, repro scaffold, diff check) and nothing repo-specific"],
  ["Scaling", "Parallel attempts, best-of-n, judges", "Time cap; concurrency unknown", "Only if the budget analysis shows spare time per task"],
], [1500, 2750, 2150, W - 6400]));
C.push(gap(240));
C.push(H2("5.1  A candidate architecture to test"));
C.push(...figure("figures/fig_architecture.png", [1745, 563], "Figure 3. A workflow skeleton with agentic stages, expressible entirely in YAML. Each stage is an LlmAgent with a restricted tool list and an output_key. A LoopAgent wraps Patch → Verify. The optional LoRAs are separate adapters per stage."));
C.push(P("**Why this shape.** Agentless (R08) and Kimi-Dev (R20) suggest that explicit localization and reproduction stages make weaker models more reliable. Context engineering (R09) argues for clean-context sub-stages that pass results forward as short summaries in state. SWE-Protégé (R21) suggests the main failure to design against is looping, which is easier to bound stage by stage."));
C.push(P("**Why it might lose.** Every stage boundary loses information, and the per-task time budget may be too tight for five stages. A single well-prompted LlmAgent (R06, R07) is a strong and cheap baseline. **Build that first**, measure it, and adopt the staged design only if it wins on a held-out repo."));

// ------------------------------------------------------------------ 6. READING GUIDE
C.push(...H1("06", "The reading guide", "50 readings, ranked. Work top to bottom, tick as you go, and write in the margins"));
C.push(H2("6.1  Master tracker"));
const trackerRows = READINGS.map((r) => [
  { text: r.id, bold: true, color: NAVY },
  r.title,
  { text: TYPES[r.type].short, color: TYPES[r.type].color, bold: true, fill: TYPES[r.type].tint },
  { text: PRI[r.pri].tag, bold: true, color: r.pri === 3 ? NAVY : WHITE, fill: PRI[r.pri].fill },
  `${r.mins}′`,
  "☐",
]);
C.push(dataTable(["ID", "Title", "Type", "Tier", "Min", "✓"], trackerRows, [760, 5046, 1700, 700, 680, 640]));
const tierBlurb = [
  "The minimum you need before making architecture decisions: the rules (R01–R02), the benchmark lineage (R03), the two canonical scaffold designs (R04, R08), the simplest strong baselines (R06, R07), the vocabulary (R05), the context constraint (R09) and your platform (R10–R11). About 7 hours in total.",
  "The techniques you'll most likely use in weeks 2–4: evaluation-driven tool and prompt design, how production loops work, and the open training recipes (SWE-Gym → SWE-smith → R2E-Gym → SWE-RL → DeepSWE → Kimi-Dev → SWE-Protégé → CANOPY), plus the LoRA mechanics to ship them.",
  "Alternatives, deeper background, and the related work the paper track will need: search and test-time scaling, execution-free verifiers, trajectory corpora, contamination, and serving internals.",
  "Optional reading on where the field is heading, listed compactly. Pick these up when a specific question comes up.",
];
for (const pri of [0, 1, 2]) {
  C.push(new Paragraph({ children: [new PageBreak()] }));
  C.push(H2(`6.${pri + 2}  Tier ${PRI[pri].tag} · ${PRI[pri].label}`));
  C.push(tierIntro(pri, tierBlurb[pri]));
  C.push(gap(240));
  for (const r of READINGS.filter((x) => x.pri === pri)) C.push(...card(r));
}
C.push(new Paragraph({ children: [new PageBreak()] }));
C.push(H2("6.5  Tier P3 · Horizon"));
C.push(tierIntro(3, tierBlurb[3]));
C.push(gap(200));
C.push(dataTable(["ID", "Reading", "Why it's on the list", "Notes"],
  READINGS.filter((x) => x.pri === 3).map((r) => [
    { text: r.id, bold: true, color: TYPES[r.type].color, fill: TYPES[r.type].tint },
    [new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: r.title, bold: true, size: 19, color: INK })] }),
     new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: r.meta, size: 16, color: MUTED })] }),
     new Paragraph({ spacing: { after: 0 }, children: [link(r.url, 15)] })],
    r.why,
    { text: " ", fill: NOTE },
  ]), [760, 3600, 2800, W - 7160]));

// ------------------------------------------------------------------ 7. PLAN
C.push(...H1("07", "Six-week reading and experiment plan", "Reading paired with building, timed against the 12 Nov and 2 Dec deadlines"));
C.push(dataTable(["Week", "Read", "Build", "Milestone"], [
  [{ text: ["1", "24–30 Sep"], bold: true, color: NAVY }, "P0: R01–R11", "Local harness running (R02 or your own); gold and null sweep; port the R06 prompt; set sane budgets in eval_config", "First non-zero leaderboard score; local score within noise of the leaderboard"],
  [{ text: ["2", "1–7 Oct"], bold: true, color: NAVY }, "R12–R14, R24, R27, R28", "Trajectory logging; failure taxonomy on 50 runs; single loop vs SequentialAgent on a held-out repo", "Pick the scaffold family based on evidence"],
  [{ text: ["3", "8–14 Oct"], bold: true, color: NAVY }, "R15–R17, R23, R32", "Rejection-sample Gemma trajectories on train and synthetic tasks; LoRA smoke test on W4A16 serving", "A training set of at least 300 verified trajectories"],
  [{ text: ["4", "15–21 Oct"], bold: true, color: NAVY }, "R18–R22, R31", "First SFT LoRA; ablate rank and layers; decide whether RL is worth doing", "LoRA beats prompt-only on the held-out repo"],
  [{ text: ["5", "22 Oct–4 Nov"], bold: true, color: NAVY }, "R25–R26, R29–R30, R33–R40", "Test-time scaling if time allows; judge sub-agent; draft the paper outline", "Final architecture frozen"],
  [{ text: ["6", "5–12 Nov"], bold: true, color: NAVY }, "P3 as needed; R50 for related work", "Write the paper-track submission from your ablation logs", "**Paper track due 12 Nov**"],
  [{ text: ["7–9", "13 Nov–2 Dec"], bold: true, color: NAVY }, "No new reading", "Robustness checks, seeds, budget tuning, choosing the 2 final picks; team merges close **25 Nov**", "**Final submission due 2 Dec**"],
], [1300, 2100, 3700, W - 7100]));
C.push(gap(200));
C.push(callout("Rhythm that works", [
  bullet("Read in the morning and run experiments in the afternoon. Every paper should end with “what I will try” written in its notes box."),
  bullet("Spend the daily leaderboard submission on your **best held-out configuration**, not on exploration."),
  bullet("Keep a one-line log per experiment: config hash, local score per repo, leaderboard score, one observation. That log becomes the paper."),
]));

// ------------------------------------------------------------------ 8. RESEARCH QUESTIONS
C.push(...H1("08", "Research questions worth a paper", "Hypotheses the reading sets up, each testable within this competition"));
const rq = [
  ["Workflow vs loop at 31B", "Does a staged localize → reproduce → patch → verify pipeline beat a single tool loop for an INT4 31B model with a 32k window? At which budgets does the answer change?", "R04 R06 R08 R20"],
  ["Depth vs breadth under a hard time cap", "With a fixed per-task budget, is one long attempt better than k short attempts plus selection? Where's the crossover?", "R28 R17 R30"],
  ["Self-distillation without proprietary data", "Can rejection-sampled Gemma-only trajectories, used to train a LoRA, remove looping and never-submitting behaviour, and does the gain transfer to unseen repos?", "R15 R21 R23"],
  ["Thinking tokens vs observation tokens", "What's the trade-off curve between thinking level and budget and resolution rate when thinking and observations share 32k tokens?", "R09 R11 R37"],
  ["Do code-graph tools help?", "Measure how graph-tool use relates to localization accuracy, given the reportedly weak embeddings. Is structured search worth its tool calls?", "R27 R04"],
  ["Memorisation vs skill", "How much of the local score on fastapi, rich and requests disappears on held-out or synthetic repos? What does that imply for the private leaderboard?", "R38 R16 R39"],
];
C.push(dataTable(["#", "Question", "Hypothesis to test", "Builds on"],
  rq.map((q, i) => [{ text: `Q${i + 1}`, bold: true, color: GOLD }, { text: q[0], bold: true }, q[1], q[2]]),
  [600, 2300, W - 4400, 1500]));

// ------------------------------------------------------------------ APPENDICES
C.push(...H1("A", "Glossary", "Terms that recur across the readings"));
C.push(dataTable(["Term", "Meaning"], [
  ["ACI", "Agent-computer interface: the commands or tools and feedback formats an agent uses to act on a computer (R04)"],
  ["ADK", "Google's Agent Development Kit. Your submission compiles into an ADK agent tree"],
  ["AgentTool vs sub_agents", "AgentTool: call another agent like a function and get its summary back. sub_agents: transfer control to it"],
  ["base_commit / test_patch", "The repo state before the fix / the hidden tests added by the original PR"],
  ["FAIL_TO_PASS", "Tests that fail before the fix and must pass after it; the core of a SWE-bench-style task"],
  ["Compaction", "Summarising or dropping old conversation events to stay inside the context window"],
  ["Harness / scaffold", "Everything around the model: loop, tools, prompts, context handling, termination"],
  ["LoRA / QLoRA", "Low-rank adapter fine-tuning / LoRA trained on top of a quantized base model"],
  ["output_key / state", "ADK mechanism: an agent's final text is stored in session state and injected into later prompts via {key}"],
  ["pass@k / resolved rate", "Probability that at least one of k samples is correct / fraction of tasks whose hidden tests pass"],
  ["QAT · W4A16", "Quantization-aware training · 4-bit weights with 16-bit activations (the served model)"],
  ["Rejection-sampling FT (RFT)", "Generate many trajectories and fine-tune only on those that pass verification"],
  ["GRPO / DAPO", "Group-relative policy-optimization RL algorithms widely used for LLM agents"],
  ["Test-time scaling (TTS)", "Spending more inference compute per task (more samples, search, verification) to raise accuracy"],
  ["Trajectory", "The full record of one agent run: prompts, thoughts, tool calls and observations"],
], [2600, W - 2600]));

C.push(...H1("B", "Notes pages", "Cross-paper synthesis, experiment ideas, questions for the forum"));
const lined = (title) => [
  new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: title.toUpperCase(), bold: true, color: GOLD, size: 16, characterSpacing: 40 })] }),
  new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], borders: noBorders,
    rows: Array.from({ length: 13 }, () => new TableRow({ height: { value: 440, rule: HeightRule.EXACT }, children: [cell(new Paragraph({ spacing: { after: 0 }, children: [] }),
      { w: W, m: { top: 0, bottom: 0, left: 0, right: 0 }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D5DBE3" }, top: NONE, left: NONE, right: NONE } })] })) }),
  gap(300),
];
C.push(...lined("Patterns I keep seeing across papers"));
C.push(...lined("Ideas to test, ranked"));
C.push(...lined("Open questions (for the Kaggle forum)"));
C.push(...lined("Paper-track outline"));

C.push(...H1("C", "Sources and caveats", "Where the facts in this document come from, and how far to trust them"));
C.push(bullet("**Competition details** (§1–2) come from the organizers' `swegemma` harness guide as mirrored in a participant's public repository (R02, read 24 Sep 2026), plus the competition's public listing. Kaggle itself wasn't reachable from the environment this document was prepared in. **Check deadlines, prizes and rules on the official competition page before relying on them.** Some aggregators list 12 Nov as a deadline; that appears to be the paper track, while the main competition closes 2 Dec."));
C.push(bullet("**Paper results** are quoted from abstracts and project pages. Treat the numbers as approximate and check them in the paper before citing. Entries dated 2026 (R21, R22, R32, R38, R47) are recent preprints: confirm their arXiv IDs and final versions."));
C.push(bullet("**Community observations** (weak embeddings, LoRA instability on W4A16, 109/129 gold pass locally) come from one participant's notes and aren't confirmed by the organizers."));
C.push(bullet("**The candidate architecture, lever ranking and weekly plan** are the author's synthesis: hypotheses to test, not established results."));
C.push(gap(160));
C.push(H3("Primary links"));
[
  ["Competition", "https://www.kaggle.com/competitions/gemma-4-developer-agent"],
  ["Paper track", "https://www.kaggle.com/competitions/gemma-4-developer-agent-paper"],
  ["Anthropic Engineering blog", "https://www.anthropic.com/engineering"],
  ["OpenAI Codex articles", "https://openai.com/index/unrolling-the-codex-agent-loop/"],
  ["SWE-bench leaderboards", "https://www.swebench.com/"],
  ["ADK documentation", "https://google.github.io/adk-docs/"],
].forEach(([k, u]) => C.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: k + ":  ", bold: true, size: 19 }), link(u, 18)] })));

// ================================================================== DOCUMENT
const doc = new Document({
  creator: "Research roadmap",
  title: "Gemma 4 Developer Agent: Research Roadmap",
  description: "Literature review and prioritized reading guide for the Kaggle Gemma 4 Developer Agent competition",
  styles: {
    default: { document: { run: { font: BODY, size: 21, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 44, bold: true, font: HEAD, color: NAVY }, paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 29, bold: true, font: HEAD, color: NAVY }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: BODY, color: GOLD }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "▸", alignment: AlignmentType.LEFT, style: { run: { color: GOLD }, paragraph: { indent: { left: 460, hanging: 280 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 280 } } } },
    ] },
    { reference: "steps", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1", alignment: AlignmentType.LEFT, style: { run: { bold: true, color: GOLD, font: HEAD }, paragraph: { indent: { left: 460, hanging: 360 } } } },
    ] },
  ] },
  sections: [{
    properties: {
      titlePage: true,
      page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1150, bottom: 1100, left: MARGIN, right: MARGIN, header: 560, footer: 520 } },
    },
    headers: {
      first: new Header({ children: [new Paragraph({ children: [] })] }),
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
        children: [
          new TextRun({ text: "GEMMA 4 DEVELOPER AGENT", bold: true, color: NAVY, size: 15, characterSpacing: 40 }),
          new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE })] }),
          new TextRun({ text: "RESEARCH ROADMAP · 2026", color: MUTED, size: 15, characterSpacing: 40 }),
        ] })] }),
    },
    footers: {
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "— ", color: GOLD, size: 17 }),
        new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 17, font: HEAD }),
        new TextRun({ text: " —", color: GOLD, size: 17 }),
      ] })] }),
    },
    children: C,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../Gemma4_Developer_Agent_Research_Roadmap.docx", buf);
  console.log("written", buf.length);
});
