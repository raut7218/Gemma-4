"""Scripted OpenAI-compatible server for testing the agent loop without a GPU/API key.

Plays a fixed tool-call script for requests_6592 (grep -> read -> edit -> pytest -> submit -> final text).
  uv run python tests/fake_llm.py   # serves :8765
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

OLD = '    425: ("unordered_collection", "unordered"),'
SCRIPT = [
    ("run_command", {"command": "grep -n 'unordered' -r src | head"}),
    ("read_file", {"filepath": "src/requests/status_codes.py", "start_line": 75, "end_line": 90}),
    ("edit_file", {"filepath": "src/requests/status_codes.py", "old_string": OLD,
                   "new_string": '    425: ("unordered_collection", "unordered", "too_early"),'}),
    ("run_command", {"command": "git diff --stat | tail -3"}),
    ("submit_patch", {}),
]


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        step = sum(1 for m in req["messages"] if m["role"] == "tool")
        if step < len(SCRIPT):
            name, args = SCRIPT[step]
            msg = {"role": "assistant", "content": None, "tool_calls": [{"id": f"c{step}", "type": "function",
                   "function": {"name": name, "arguments": json.dumps(args)}}]}
            fin = "tool_calls"
        else:
            msg, fin = {"role": "assistant", "content": "Added the alias."}, "stop"
        out = {"choices": [{"message": msg, "finish_reason": fin}], "usage": {"prompt_tokens": 1000 + 500 * step, "completion_tokens": 50}}
        b = json.dumps(out).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8765), H).serve_forever()
