"""Compile bundles with the real adk_submission compiler and print what each agent would send to vLLM.

  <python with adk_submission> tests/compile_official.py submission bundles/parallel-investigate

check_bundle.py only transcribes the rules; this runs them. It needs the official packages, which are not a
dependency of this repo. One way to get them (the wheels are small, the full wheelhouse is not needed):

  kaggle datasets files metric/gemma-4-developer-agent-wheelhouse | grep -E 'adk_submission|google_adk'
  kaggle datasets download metric/gemma-4-developer-agent-wheelhouse -f adk_submission-<ver>-py3-none-any.whl -p /tmp/adk
  uv venv /tmp/adk/venv --python 3.12
  uv pip install --python /tmp/adk/venv/bin/python /tmp/adk/adk_submission-*.whl google-adk litellm
  /tmp/adk/venv/bin/python tests/compile_official.py

The limits below are copied from swegemma 0.2.11's config.build_submission_limits; tools are stubs with the
official names, so a pass means the YAML, includes, tool names, model alias and generation config are accepted.
"""
import sys
from pathlib import Path

from adk_submission import ModelRegistry, compile_submission
from adk_submission.limits import GenerationConstraints, NumericRange, SubmissionLimits
from google.adk.models.lite_llm import LiteLlm

ROOT = Path(__file__).resolve().parent.parent
limits = SubmissionLimits(max_total_size_bytes=3 * 1024**3, max_yaml_size_bytes=50 * 1024 * 1024, max_skill_size_bytes=50 * 1024 * 1024,
                          max_file_count=10_000, max_yaml_files=1_000, max_instruction_chars=1_000_000, max_total_instruction_chars=10_000_000,
                          max_agents=500, max_sub_agent_depth=50, max_skills=1_000, max_loop_iterations=500,
                          allowed_file_extensions=frozenset({".yaml", ".yml", ".md", ".txt", ".py", ".json", ".safetensors"}),
                          adapter_extensions=frozenset({".safetensors"}))
gc = GenerationConstraints(allowed_fields=None, max_output_tokens=NumericRange(1, 32768), thinking_budget=NumericRange(0, 32768),
                           defaults={"max_output_tokens": 16384, "thinking_config": {"thinking_budget": 4096}})


def tool(name):
    def f(command: str = "") -> dict:
        """Stub."""
        return {}
    f.__name__ = name
    return f


TOOLS = {n: tool(n) for n in ("run_command", "read_file", "write_file", "edit_file", "submit_patch", "get_status",
                              "get_code_neighbors", "search_similar_code", "get_code_subgraph")}
models = ModelRegistry()
for m in ("31b", "12b", "e4b", "e2b"):  # the four models allowed in submissions (ALLOWED_MODEL_NAMES)
    name = f"gemma-4-{m}-it-qat-w4a16-ct"
    models.register(name, LiteLlm(model=f"openai/{name}", api_base="http://127.0.0.1:8000/v1", num_retries=5))


def walk(a, depth=0):
    line = f"{'  ' * depth}{type(a).__name__} {a.name}"
    if hasattr(a, "model") and not isinstance(a.model, str):
        g = a.generate_content_config
        tc = getattr(g, "thinking_config", None)
        line += (f" | tools={[getattr(t, 'name', getattr(t, '__name__', '?')) for t in a.tools]}"
                 f" | temp={g.temperature} top_p={g.top_p} top_k={g.top_k} max_out={g.max_output_tokens}"
                 f" | thinking_config=(budget={getattr(tc, 'thinking_budget', None)}, include_thoughts={getattr(tc, 'include_thoughts', None)})"
                 f" | sent to vLLM: {a.model._additional_args.get('extra_body')}"
                 f" | instruction={len(a.instruction)} chars")
    print(line)
    for c in getattr(a, "sub_agents", []) or []:
        walk(c, depth + 1)


rc = 0
for b in sys.argv[1:] or ["submission", "bundles/parallel-investigate"]:
    print(f"\n== {b}")
    try:
        walk(compile_submission(submission_dir=ROOT / b, tool_registry=TOOLS, model_registry=models, limits=limits, generation_constraints=gc))
        print("COMPILED OK")
    except Exception as e:
        rc = 1; print(f"COMPILE FAILED: {type(e).__name__}: {e}")
sys.exit(rc)
