// Shared design tokens: colours, type, timing grid, handoff positions.
// Everything on screen derives from these values.
window.TOK = {
  W: 1920, H: 1080, FPS: 60,
  BPM: 80,                       // music tempo; every composition boundary sits on a beat
  get BEAT() { return 60 / this.BPM },   // 0.75 s

  // Palette (3Blue1Brown-like on deep ink). Contrast vs BG measured in docs/contrast.md.
  BG: '#0E1116',
  INK: '#ECE9E2',      // primary text
  DIM: '#9AA3AD',      // secondary text (>= 4.5:1 on BG)
  FAINT: '#2A323C',    // grid / rules (decorative only, never text)
  BLUE: '#58C4DD',
  TEAL: '#5CD0B3',
  GREEN: '#83C167',
  YELLOW: '#F4D35E',
  GOLD: '#F0AC5F',
  RED: '#FC6255',
  PURPLE: '#B48EDB',
  PANEL: '#151A21',
  THINK: '#8FA7D9',    // the model's thinking (not training): muted periwinkle
  REPO: ['#C9CED6', '#9AA3AD', '#6F7883', '#4E5661'],  // repositories: one neutral family, lightness steps    // plate behind text that sits over busy pictures

  SERIF: "'CM', 'KaTeX_Main', serif",
  ITAL: "'CMI', 'KaTeX_Main', serif",
  MONO: "'CMT', 'KaTeX_Typewriter', monospace",
  SANS: "'CMS', 'KaTeX_SansSerif', sans-serif",

  // Handoff anchors: exact pixel positions where carried objects land across scenes.
  P: {
    center: [960, 540],
    titleY: 470,
    leftCol: 560, rightCol: 1360,
    chapterTag: [120, 84],
  },
};
