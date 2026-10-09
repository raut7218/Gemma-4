"""Scripted OpenAI-compatible server for testing the agent loop without a GPU/API key.

Plays a fixed tool-call script for requests_6592 (and the toy copy from make_toy_task.py). The script is
picked from the system prompt: the parallel-investigate bundle's roles ("Your role: LOCALIZER" ...) each
get their own, anything else gets the single-agent script (grep -> read -> edit -> diff -> submit).
  uv run python tests/fake_llm.py   # serves :8765
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FILE = "src/requests/status_codes.py"
OLD = '    425: ("unordered_collection", "unordered"),'
NEW = '    425: ("unordered_collection", "unordered", "too_early"),'
REPRO = "import requests\nassert requests.codes.too_early == 425, 'missing alias'\nprint('ok')\n"
SCRIPTS = {
    "default": [
        ("run_command", {"command": "grep -n 'unordered' -r src | head"}),
        ("read_file", {"filepath": FILE, "start_line": 75, "end_line": 90}),
        ("edit_file", {"filepath": FILE, "old_string": OLD, "new_string": NEW}),
        ("run_command", {"command": "git diff --stat | tail -3"}),
        ("submit_patch", {}),
        "Added the alias.",
    ],
    "LOCALIZER": [
        ("run_command", {"command": "test -f /tmp/location.md && cat /tmp/location.md; grep -rn 'unordered' src | head"}),
        ("run_command", {"command": f"cat > /tmp/location.md <<'EOF'\nFILES: {FILE}\nCHANGE: add too_early to 425\nEOF"}),
        f"FILES: {FILE}\nCURRENT: {OLD.strip()}\nCHANGE: add the too_early alias to 425\nNAMES: too_early",
    ],
    "REPRODUCER": [
        ("run_command", {"command": f"cat > /tmp/repro.py <<'EOF'\n{REPRO}EOF\ncd /workspace && timeout 60 python /tmp/repro.py 2>&1 | tail -5"}),
        "REPRO: cd /workspace && timeout 60 python /tmp/repro.py\nSTATUS: FAILS AS EXPECTED",
    ],
    "TEST SCOUT": [
        ("run_command", {"command": "grep -rln codes tests | head -10"}),
        "VERIFY: cd /workspace && timeout 90 python -m pytest tests -x -q -p no:cacheprovider\nBASELINE: all pass",
    ],
    "FIXER": [
        ("run_command", {"command": f"git status --short; git diff --stat; grep -n unordered {FILE}"}),
        ("edit_file", {"filepath": FILE, "old_string": OLD, "new_string": NEW}),
        ("run_command", {"command": "cd /workspace && timeout 60 python /tmp/repro.py 2>&1 | tail -15"}),
        ("run_command", {"command": "git status --short; git diff --stat"}),
        ("submit_patch", {}),
        "Added the too_early alias.",
    ],
}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        system = req["messages"][0].get("content") or ""
        role = next((r for r in SCRIPTS if f"Your role: {r}" in system), "default")
        script = SCRIPTS[role]
        step = min(sum(1 for m in req["messages"] if m["role"] == "tool"), len(script) - 1)
        item = script[step]
        if isinstance(item, str):
            msg, fin = {"role": "assistant", "content": item}, "stop"
        else:
            name, args = item
            msg = {"role": "assistant", "content": None, "tool_calls": [{"id": f"{role[:3]}{step}", "type": "function",
                   "function": {"name": name, "arguments": json.dumps(args)}}]}
            fin = "tool_calls"
        out = {"choices": [{"message": msg, "finish_reason": fin}], "usage": {"prompt_tokens": 1000 + 500 * step, "completion_tokens": 50}}
        b = json.dumps(out).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
