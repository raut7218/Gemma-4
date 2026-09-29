"""Make swelite run skill scripts the way the official scorer does.

swelite gives ADK's SkillToolset a sandbox *environment*, so its run_skill_script
declares a required `command` argument. The official scorer (swegemma 0.2.7,
adk_submission 0.2.11) gives it a *code executor* instead
(adk_eval_core.sandbox.base.AdkSandboxCodeExecutor). There, run_skill_script takes
skill_name and file_path, and ADK wraps the script and runs the wrapper as
`python3 /workspace/.adk_exec_<hex>.py`, charged as one tool call. A bundle whose
prompt follows the official contract fails every skill call under stock swelite.
This module swaps in an executor with the official behaviour.

Import it before swelite's CLI runs:
    python -c "import swelite_official_skills; from swelite.cli import app; app()" eval ...
"""

import json
import uuid
from typing import Any

from google.adk.code_executors.base_code_executor import BaseCodeExecutor
from google.adk.code_executors.code_execution_utils import CodeExecutionInput, CodeExecutionResult
from google.adk.skills import load_skill_from_dir
from google.adk.tools.skill_toolset import SkillToolset
from pydantic import ConfigDict

import swelite.skills

class SwegemmaLikeExecutor(BaseCodeExecutor):
    """Mirrors AdkSandboxCodeExecutor: write the wrapper into /workspace, run it with python3, delete it."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    ctx: Any = None

    def execute_code(self, invocation_context: Any, code_execution_input: CodeExecutionInput) -> CodeExecutionResult:
        name = f".adk_exec_{uuid.uuid4().hex[:8]}.py"
        self.ctx.sandbox.write_text(f"/workspace/{name}", code_execution_input.code)
        # The subprocess sandbox maps /workspace and /tmp to private directories by rewriting
        # command strings, not file contents, so check.py learns the real paths from this
        # command. Its verify line needs nothing: the agent wrote the plan file through
        # run_command, so the sandbox already rewrote the paths in it.
        command = f"PRESUBMIT_WORKSPACE=/workspace PRESUBMIT_PLAN=/tmp/plan.md python3 /workspace/{name}"
        try:
            # ctx.run_command gates on the budget and charges one tool call, as the scorer does.
            raw = json.loads(self.ctx.run_command(command))
        finally:
            self.ctx.sandbox.exec(f"rm -f /workspace/{name}", timeout=30)
        if raw.get("status") == "ok":
            return CodeExecutionResult(stdout=raw.get("stdout", ""), stderr="", output_files=[])
        details = raw.get("details", {})
        stderr = details.get("stderr") or raw.get("error_message", "")
        return CodeExecutionResult(stdout=details.get("stdout", raw.get("stdout", "")), stderr=stderr, output_files=[])


def build_skill_toolset(skill_dirs, env, script_timeout=300):
    skills = [load_skill_from_dir(d) for d in skill_dirs]
    return SkillToolset(skills=skills, code_executor=SwegemmaLikeExecutor(ctx=env.ctx), script_timeout=script_timeout)


swelite.skills.build_skill_toolset = build_skill_toolset
