"""locate.py TERM... : where do the issue's names and messages live?

Ranks tracked non-test .py files by how many distinct terms they contain and prints each hit with the
function or class around it, so the next read can be a narrow line range. Runs from a temp dir (the ADK
skill wrapper chdirs there), so the workspace path is absolute; SWE_WORKSPACE overrides it for local runs.
"""
import ast
import os
import re
import subprocess
import sys

WS = os.environ.get("SWE_WORKSPACE") or "/workspace"
TEST = re.compile(r"(^|/)(tests?|testing)/|(^|/)(test_[^/]*|[^/]*_test|conftest)\.py$")
CAP = 1500


def terms_from(argv):
    out = []
    for a in argv:
        if a.startswith("-"):  # flag names from dict-style args; their values are kept
            continue
        out += [t.strip() for t in re.split(r"[|,]", a) if len(t.strip()) >= 3]
    return list(dict.fromkeys(out))[:6]


def scopes(src):
    """(start, end, qualified name) for every def/class, innermost last."""
    try:
        tree = ast.parse(src)
    except (SyntaxError, ValueError):
        return []
    out = []

    def walk(node, prefix):
        for ch in ast.iter_child_nodes(node):
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                name = prefix + ch.name
                out.append((ch.lineno, ch.end_lineno or ch.lineno, name))
                walk(ch, name + ".")
            else:
                walk(ch, prefix)

    walk(tree, "")
    return out


def enclosing(sc, line):
    best = None
    for s, e, n in sc:
        if s <= line <= e and (best is None or s >= best[0]):
            best = (s, e, n)
    return f"in {best[2]} (L{best[0]}-{best[1]})" if best else "at module level"


def main():
    terms = terms_from(sys.argv[1:])
    if not terms:
        print("usage: locate.py TERM [TERM...]  (names, messages or phrases from the issue, 3+ chars)")
        return
    files = subprocess.run(["git", "ls-files", "*.py"], cwd=WS, capture_output=True, text=True).stdout.split()
    hits = {}  # path -> {term: [line numbers]}
    tests = {}
    for low in (False, True):  # exact case first; terms with no exact hit retry case-insensitively
        todo = [t for t in terms if not any(t in h for h in hits.values())] if low else terms
        if not todo:
            break
        for f in files:
            try:
                lines = open(os.path.join(WS, f), encoding="utf-8", errors="replace").read().split("\n")
            except OSError:
                continue
            for t in todo:
                tt = t.lower() if low else t
                found = [i + 1 for i, l in enumerate(lines) if tt in (l.lower() if low else l)]
                if found:
                    (tests if TEST.search(f) else hits).setdefault(f, {})[t] = found
    missing = [t for t in terms if not any(t in h for h in hits.values())]
    rank = sorted(hits, key=lambda f: (-len(hits[f]), -sum(min(len(v), 5) for v in hits[f].values()), f))
    out = []
    for f in rank[:5]:
        src = open(os.path.join(WS, f), encoding="utf-8", errors="replace").read()
        sc, lines = scopes(src), src.split("\n")
        out.append(f"{f}  [{', '.join(hits[f])}]")
        shown = sorted({n for v in hits[f].values() for n in v[:3]})[:4]
        for n in shown:
            out.append(f"  L{n} {enclosing(sc, n)}: {lines[n - 1].strip()[:90]}")
    if not rank:
        out.append("no source file contains these terms")
    if missing:
        out.append("not found in source: " + ", ".join(missing))
    trank = sorted(tests, key=lambda f: (-len(tests[f]), f))[:3]
    if trank:
        out.append("tests mentioning them: " + ", ".join(f"{f} [{', '.join(tests[f])}]" for f in trank))
    text = "\n".join(out)
    print(text if len(text) <= CAP else text[:CAP] + "\n...(cut)")


if __name__ == "__main__":
    main()
