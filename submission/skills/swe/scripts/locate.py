"""locate.py TERM... : where do the issue's names and messages live?

Ranks tracked non-test .py files by IDF-weighted term matches (with filename and AST symbol boosts),
prints the most informative hits (prioritizing def/class definitions and function bodies over imports)
with their enclosing scope and line range, resolves 1-hop local callees, and always preserves the
test-file footer within the 1500-char cap.
"""
import ast
import math
import os
import re
import subprocess
import sys

WS = os.environ.get("SWE_WORKSPACE") or "/workspace"
TEST = re.compile(r"(^|/)(tests?|testing)/|(^|/)(test_[^/]*|[^/]*_test|conftest)\.py$")
AUX = re.compile(r"(^|/)(docs_src|examples|benchmarks)/")
IMPORT_RE = re.compile(r"^\s*(import |from \S+ import )")
DEF_SYM_RE = re.compile(r"^[ \t]*(?:async[ \t]+)?(?:def|class)[ \t]+([A-Za-z_]\w*)", re.M)
CAP = 1500


def terms_from(argv):
    raw = []
    for a in argv:
        if a.startswith("-"):  # flag names from dict-style args; their values are kept
            continue
        raw += [t.strip() for t in re.split(r"[|,;]", a) if len(t.strip()) >= 3]
    out = list(dict.fromkeys(raw))
    # Expand dotted symbol queries (e.g. PreparedRequest.copy) so class and method lines both match
    for t in list(out):
        if "." in t and not t.endswith(".py") and " " not in t:
            for part in t.split("."):
                if len(part) >= 3 and part not in out:
                    out.append(part)
    return out[:8]


def scopes(src):
    """(start, end, qualified name, node) for every def/class, innermost last."""
    try:
        tree = ast.parse(src)
    except (SyntaxError, ValueError):
        return [], {}
    out = []
    calls = {}

    def walk(node, prefix):
        for ch in ast.iter_child_nodes(node):
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                name = prefix + ch.name
                end = ch.end_lineno or ch.lineno
                out.append((ch.lineno, end, name))
                if not isinstance(ch, ast.ClassDef):
                    cnames = []
                    for sub in ast.walk(ch):
                        if isinstance(sub, ast.Call):
                            fn = sub.func
                            cn = fn.id if isinstance(fn, ast.Name) else fn.attr if isinstance(fn, ast.Attribute) else None
                            if cn and len(cn) >= 3 and cn != ch.name and cn not in cnames:
                                cnames.append(cn)
                    if cnames:
                        calls[name] = cnames
                walk(ch, name + ".")
            else:
                walk(ch, prefix)

    walk(tree, "")
    return out, calls


def enclosing_info(sc, line):
    best = None
    for s, e, n in sc:
        if s <= line <= e and (best is None or s >= best[0]):
            best = (s, e, n)
    return best


def enclosing(sc, line):
    best = enclosing_info(sc, line)
    return f"in {best[2]} (L{best[0]}-{best[1]})" if best else "at module level"


def main():
    terms = terms_from(sys.argv[1:])
    if not terms:
        print("usage: locate.py TERM [TERM...]  (names, messages or phrases from the issue, 3+ chars)")
        return
    files = subprocess.run(["git", "ls-files", "*.py"], cwd=WS, capture_output=True, text=True).stdout.split()
    hits = {}  # path -> {term: [line numbers]}
    tests = {}
    file_lines = {}
    defs_index = {}  # symbol_name -> (file, line)
    for f in files:
        try:
            text = open(os.path.join(WS, f), encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        file_lines[f] = text.split("\n")
        if not TEST.search(f):
            for m in DEF_SYM_RE.finditer(text):
                sym = m.group(1)
                if sym not in defs_index:
                    defs_index[sym] = (f, text[:m.start()].count("\n") + 1)

    for low in (False, True):  # exact case first; terms with no exact hit retry case-insensitively
        todo = [t for t in terms if not any(t in h for h in hits.values())] if low else terms
        if not todo:
            break
        for f, lines in file_lines.items():
            is_test = bool(TEST.search(f))
            f_low = f.lower()
            for t in todo:
                tt = t.lower() if low else t
                found = [i + 1 for i, l in enumerate(lines) if tt in (l.lower() if low else l)]
                # Also match filename/path stems for source files when content search has no hit
                if not found and not is_test and len(t) >= 4 and t.lower().removesuffix(".py") in f_low:
                    found = [1]
                if found:
                    (tests if is_test else hits).setdefault(f, {})[t] = found

    missing = [t for t in terms if not any(t in h for h in hits.values())]
    df = {t: sum(1 for h in hits.values() if t in h) for t in terms}
    idf = {t: 1.0 / math.log2(2 + df.get(t, 0)) for t in terms}
    want_docs = any(k in " ".join(terms).lower() for k in ("doc", "tutorial", "docs_src"))

    def file_score(f):
        h = hits[f]
        lines = file_lines.get(f, [])
        s = 0.0
        f_low = f.lower()
        for t, lns in h.items():
            w = idf.get(t, 0.5)
            s += w * (1.0 + 0.12 * min(len(lns), 5))
            if t.lower().removesuffix(".py") in f_low:
                s += 0.6 * w
            # Boost files where a matched line is an actual def/class definition
            if any(re.match(r"^\s*(?:async\s+)?(?:def|class)\s+", lines[n - 1]) for n in lns if n <= len(lines)):
                s += 0.4 * w
        if AUX.search(f) and not want_docs:
            s *= 0.65
        return (-len(h), -round(s, 4), bool(AUX.search(f)), f)

    all_ranked = sorted(hits, key=file_score)
    # Prevent docs_src/ clones from crowding out core library files in top 5
    rank, aux_count = [], 0
    for f in all_ranked:
        if AUX.search(f) and not want_docs:
            if aux_count >= 1:
                continue
            aux_count += 1
        rank.append(f)
        if len(rank) == 5:
            break
    if len(rank) < 5:
        for f in all_ranked:
            if f not in rank:
                rank.append(f)
                if len(rank) == 5:
                    break

    footer = []
    if not rank:
        footer.append("no source file contains these terms")
    if missing:
        footer.append("not found in source: " + ", ".join(missing))
    trank = sorted(tests, key=lambda f: (-len(tests[f]), -sum(idf.get(t, 0.5) for t in tests[f]), f))[:3]
    if trank:
        footer.append("tests mentioning them: " + ", ".join(f"{f} [{', '.join(tests[f])}]" for f in trank))

    body = []
    for f in rank:
        lines = file_lines[f]
        src = "\n".join(lines)
        sc, calls = scopes(src)
        body.append(f"{f}  [{', '.join(hits[f])}]")

        def line_priority(n):
            txt = lines[n - 1] if n <= len(lines) else ""
            info = enclosing_info(sc, n)
            is_def = bool(re.match(r"^\s*(?:async\s+)?(?:def|class)\s+", txt))
            def_matches_term = is_def and any(t.lower() in txt.lower() for t in hits[f])
            is_import = bool(IMPORT_RE.match(txt))
            in_scope = info is not None and not is_import
            term_w = sum(idf.get(t, 0.5) for t, lns in hits[f].items() if n in lns)
            return (
                2 if def_matches_term else 1 if is_def else 0,
                0 if is_import else (2 if in_scope else 1),
                round(term_w, 4),
                -n,
            )

        # Pick the best line per matched term first (rarest term first), then fill up to 4 lines
        chosen = []
        seen_scopes = set()
        for t in sorted(hits[f], key=lambda x: -idf.get(x, 0.5)):
            cands = sorted(hits[f][t], key=line_priority, reverse=True)
            for n in cands:
                if n not in chosen:
                    chosen.append(n)
                    info = enclosing_info(sc, n)
                    if info:
                        seen_scopes.add(info[2])
                    break
        if len(chosen) < 4:
            pool = sorted({n for v in hits[f].values() for n in v} - set(chosen), key=line_priority, reverse=True)
            # Prefer lines in new scopes first before adding second lines in the same scope
            for prefer_new_scope in (True, False):
                for n in pool:
                    if len(chosen) >= 4:
                        break
                    if n in chosen:
                        continue
                    info = enclosing_info(sc, n)
                    sc_name = info[2] if info else None
                    if prefer_new_scope and sc_name in seen_scopes:
                        continue
                    chosen.append(n)
                    if sc_name:
                        seen_scopes.add(sc_name)

        shown = sorted(chosen[:4])
        hop_hints = []
        for n in shown:
            body.append(f"  L{n} {enclosing(sc, n)}: {lines[n - 1].strip()[:90]}")
            info = enclosing_info(sc, n)
            if info and info[2] in calls:
                for callee in calls[info[2]]:
                    if callee in defs_index:
                        cf, cl = defs_index[callee]
                        loc_str = f"{callee} ({cf}:L{cl})" if cf != f else f"{callee} (L{cl})"
                        if loc_str not in hop_hints:
                            hop_hints.append(loc_str)
        if hop_hints:
            body.append("  calls: " + ", ".join(hop_hints[:3]))

    footer_text = "\n".join(footer)
    body_text = "\n".join(body)
    if not footer_text:
        text = body_text
        print(text if len(text) <= CAP else text[:CAP] + "\n...(cut)")
    else:
        avail = CAP - len(footer_text) - 1
        if len(body_text) > avail:
            body_text = body_text[: max(0, avail - 8)] + "\n...(cut)"
        print((body_text + "\n" + footer_text).strip())


if __name__ == "__main__":
    main()
