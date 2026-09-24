# Research roadmap: source

Generates `../Gemma4_Developer_Agent_Research_Roadmap.docx`.

```bash
npm install            # installs docx
python3 diagrams.py    # re-renders figures/ (needs matplotlib)
node build.js          # writes the .docx one level up
```

- `readings.js`: the 50 annotated readings (edit here to add or re-rank items)
- `build.js`: document layout and all section text
- `diagrams.py`: the pipeline, timeline and architecture figures
