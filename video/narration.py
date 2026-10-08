"""Narration text, keyed by segment. Voice (tts.py) and visuals (scenes.py) both read this."""

N = {
# ---------------------------------------------------------------- 1. intro
"s1_a": "Zero point zero eight. That is the score this repository earned on the Gemma 4 Developer Agent competition. "
        "Eight percent. Before we try to improve a number like that, we have to answer a more basic question: "
        "what exactly is being measured, and which part of this system produced it?",
"s1_b": "This video is a guided tour of the repo, written for an AI engineer. We will go from the task definition, "
        "to the file layout, the submission bundle, the agent loop, the tools and the sandbox, and the grader. "
        "Then, with all of that in hand, we will look at where the missing ninety two percent could be hiding. "
        "I will try to keep apart what the code proves, and what is only a hypothesis.",

# ---------------------------------------------------------------- 2. the task
"s2_a": "The competition is a software engineering benchmark in the style of SWE-bench. Each task is a real GitHub issue "
        "from a real Python project. In this repo's data those projects are requests, httpx, rich and fastapi. "
        "The agent receives a frozen snapshot of the repository, the text of the issue, which is called the problem statement, "
        "and sometimes some hints. Nothing else.",
"s2_b": "Its job is to change the library code so that the issue is fixed. The output is not a chat answer. "
        "It is a patch: a git diff against the snapshot. That patch is the only thing that gets graded.",
"s2_c": "Grading uses hidden tests. Every task carries a test patch, a set of tests the agent never sees. "
        "The grader applies your patch to a fresh copy of the repo, adds the hidden tests, runs pytest, "
        "and asks one binary question: did the tests that are supposed to pass, actually pass? "
        "Resolved, or not. There is no partial credit.",
"s2_d": "So the score is simply the fraction of tasks resolved. Assuming the leaderboard number is the resolution rate, "
        "which is what this harness computes, then zero point zero eight means that out of every hundred tasks, "
        "about eight were fixed. Ninety two were not. And those are ninety two different ways to fail, "
        "that we want to be able to tell apart.",
"s2_e": "The model is fixed, too. The config names it gemma 4, thirty one B, instruction tuned, quantized to four bit weights. "
        "You cannot swap in a bigger one. So all of your leverage lives in the scaffolding around the model: "
        "the prompt, the tools, the budgets, and the sampling settings. And that is exactly what this repo contains.",

# ---------------------------------------------------------------- 3. repo map
"s3_a": "Let us open the repo. There are four things worth knowing. First, the submission directory: four small text files. "
        "This is literally what you zip and upload to Kaggle. Second, the harness package: nearly six hundred lines of Python, "
        "standard library plus PyYAML, which re-implements the competition's evaluation loop locally. "
        "Third, tests slash fake L L M: a scripted fake model server. And fourth, a shell script that downloads task snapshots.",
"s3_b": "The split between submission and harness is the most important idea in the repo. "
        "The submission is the thing being scored. The harness is a replica of the scorer, built so you can iterate "
        "without waiting for a Kaggle run. The README is candid that the replica is not the real thing. "
        "It lists the known gaps, and we will come back to them, because they matter when you debug.",
"s3_c": "One more note from the git history. Earlier commits held a different submission, a port of a senior developer prompt, "
        "with an A B runner. The latest commit message says it replaces all that with a local baseline harness. "
        "So what we are studying is the simplest honest starting point, not a tuned entry.",

# ---------------------------------------------------------------- 4. submission
"s4_a": "Agent dot yaml is the entry point. It is an A D K agent definition, A D K being Google's Agent Development Kit. "
        "A name, the model, an instruction that is included from system dot m d, a list of tools, "
        "and a generation config included from sampling dot yaml.",
"s4_b": "Nine tools are declared. Six are plain: run command, read file, edit file, write file, get status, and submit patch. "
        "Three are graph tools: search similar code, get code neighbors, and get code subgraph. "
        "Those query a precomputed code graph and an embedding index that, according to the README, live on Kaggle. "
        "The local harness does not implement them. Keep that in mind. If the model calls one locally, it just gets an unknown tool error.",
"s4_c": "Eval config sets the hard limits. A single command may run for one hundred eighty seconds. "
        "The whole session gets forty tool calls, four and a half minutes of wall clock time, and eighty model turns. "
        "Whichever runs out first ends the session. Notice how tight that is: four and a half minutes "
        "to read an issue, find the code, edit it, test it, and submit.",
"s4_d": "Sampling dot yaml. Temperature zero point two, top p zero point nine five, at most eight thousand one hundred ninety two output tokens, "
        "and a thinking budget of zero, with thoughts not included. So the model's reasoning mode is switched off, "
        "and the low temperature makes it close to deterministic.",
"s4_e": "Then the system prompt: only about a hundred and fifty words. It says: be fast, minimal and precise. "
        "It gives a four step workflow: locate with grep, edit with small edits, verify with one targeted test, "
        "clean up and submit. And it adds rules: never edit tests, never run the whole suite, keep reasoning to a few sentences. "
        "Everything the model knows about strategy comes from these words.",

# ---------------------------------------------------------------- 5. agent loop
"s5_a": "Now the heart of it: harness slash agent dot py, about a hundred lines. Before the loop starts, build prompt constructs the first user message. "
        "It contains the repo name, the problem statement, optional hints, the task budget, the execution rules, "
        "such as five thousand character output limits and hundred fifty line reads, a reminder that the environment is offline, "
        "the instructions, and finally a directory listing three levels deep, capped at a hundred fifty entries.",
"s5_b": "The message list starts with just two entries: system, and user. Then we loop. Each iteration first checks "
        "two things before calling the model: is there time left, and have we used up the turns? If either fails, the session ends.",
"s5_c": "Then one call to the chat completions endpoint of any OpenAI compatible server. The request carries the tool schemas, "
        "and the sampling settings are mapped across: max output tokens becomes max tokens, and so on. "
        "Transient HTTP errors, four twenty nine and the five hundreds, are retried up to five times with exponential backoff.",
"s5_d": "The reply is logged to the trace, including the prompt token count. And here is the first guard. "
        "If prompt tokens reach thirty two thousand seven hundred sixty eight, the run ends right there, as context overflow. "
        "That number is the context window the harness assumes. We will see how quickly you can reach it.",
"s5_e": "If the assistant message contains tool calls, each one is parsed and dispatched to the context object. "
        "Malformed JSON arguments produce an invalid arguments error that goes back to the model as a tool message, "
        "so it can correct itself. After the calls, if submit patch was called, the loop ends with the reason: submitted.",
"s5_f": "What if the model answers with plain text and no tool call? That is the nudge mechanism. If the reply was cut off by the token limit, "
        "the harness says: do not repeat your analysis, emit your next tool call now. Otherwise it says: please continue using tools, "
        "or call submit patch. If nudging fails three times in a row, the loop gives up with no tool calls. "
        "Any successful tool call resets the counter.",
"s5_g": "So there are exactly six ways the loop can end: submitted, time, turns, L L M error, context overflow, and no tool calls. "
        "Remember those six. They map straight onto the failure categories we will meet at the end.",

# ---------------------------------------------------------------- 6. tools + sandbox
"s6_a": "The tools live in tools dot py. Each returns a JSON string, with a status of okay or error, an error type, and a message. "
        "The caps are deliberate. Command output is cut at five thousand characters. "
        "A single read returns at most a hundred fifty lines, or ten thousand characters.",
"s6_b": "Every tool call except get status and submit patch is metered. Before it runs, a gate checks the time and the call count. "
        "If the budget is gone, you get a budget exhausted error. Otherwise the counter goes up. "
        "And once twenty calls are used and ten or fewer remain, a budget warning is appended to the result, telling the model to wrap up.",
"s6_c": "Edit file is the most interesting tool. It first tries an exact string match, which must hit exactly once, "
        "unless you pass allow multiple. If there is no exact match, it falls back to a flexible mode: "
        "compare line by line, ignoring leading and trailing whitespace, and if found, re-indent the replacement to match the file. "
        "That is a forgiving design, since smaller models often get indentation slightly wrong.",
"s6_d": "Run command executes bash inside a sandbox. A sandbox here is just a temporary directory. The snapshot tarball is extracted into workspace, "
        "committed to git as a baseline, and tagged. Commands that mention slash workspace or slash tmp are rewritten with a regular expression "
        "to the sandbox's real directories, so the model believes it lives in a tidy container. "
        "The environment points PATH at a virtualenv, and PYTHONPATH at the workspace and its src folder.",
"s6_e": "When the model calls submit patch, the harness runs git add dash N dot, which marks new files as intent to add, "
        "and then git diff against the baseline tag. The result is the patch. Two consequences. "
        "Any scratch file the model left in the workspace becomes part of the patch, which is why the prompt says to remove them. "
        "And because this is a plain subprocess, there is no real isolation. It is a testing convenience, not a security boundary.",

# ---------------------------------------------------------------- 7. verification
"s7_a": "After the agent finishes, verify dot py grades the patch in a brand new sandbox, so nothing the agent did to its environment can leak in. "
        "Step one: apply the patch, trying five strategies, from a strict git apply to ignoring whitespace to the classic patch dash p one. "
        "If none works, the outcome is patch rejected.",
"s7_b": "Step two is the anti-cheating step. Any file in the patch that matches a protected pattern, "
        "test files, conftest, pytest ini, pyproject, tox, setup cfg, site customize, pth files, anything under a tests directory, "
        "is reset to the baseline. Edits to tests are simply erased. Then the hidden test patch is applied, "
        "and pytest runs on the test files it touches, producing a JUnit XML report.",
"s7_c": "Step three: what counts as passing? The official grader uses lists of fail to pass and pass to pass tests. "
        "This task file does not have them, so the local harness approximates: the required tests are those that pass with the gold patch, "
        "cached on disk. A task is resolved only if every required test passes. The README warns that official grading may differ slightly.",
"s7_d": "Finally, classify labels each outcome. Resolved. Context overflow. If there is no patch at all: budget exhausted for time or turns, "
        "loop breakout for no tool calls, L L M error, otherwise no patch. And if there is a patch that failed: patch rejected, or tests failed. "
        "This taxonomy is your main diagnostic tool.",

# ---------------------------------------------------------------- 8. walkthrough
"w_a": "Let us watch one complete run, using the scripted fake model that ships with the repo. The task is requests 6592. "
       "In this script, the fix is a one line alias: in src requests status codes dot py, the entry for status code 425 gets a third name, too early, "
       "next to unordered collection and unordered.",
"w_b": "Turn one. The fake server counts the tool messages so far, zero, and plays step zero: grep for unordered under src. "
       "Turn two: read file, lines seventy five to ninety. Turn three: edit file, replacing the 425 entry with one that also contains too early. "
       "Turn four: git diff stat, a sanity check. Turn five: submit patch.",
"w_c": "Look at what happens next. Submit patch sets a flag, and the loop checks that flag right after dispatching the tool calls. "
       "So in this local loop, the final one sentence reply that the prompt asks for is never even requested. The run ends on the spot, with the reason: submitted. "
       "Five turns, four metered tool calls, and the fake reports prompt tokens growing from one thousand to three thousand.",
"w_d": "Then the pipeline continues without the agent. The patch is the diff against the baseline tag: one file, one line. "
       "The verifier builds a fresh sandbox, applies it, adds the hidden tests, runs pytest, and compares against the cached set of required tests. "
       "Everything lands in a results folder: summary, per task results, the patch, the trace, and the test log.",
"w_e": "Two other agents exist for sanity checks. The gold agent applies the reference patch, and must come out resolved. The noop agent submits nothing, and must not. "
       "They bracket the grader. If gold fails, your sandbox or dependencies are broken. If noop passes, your tests do not actually test the fix.",

# ---------------------------------------------------------------- 9. gaps
"g_a": "Before the hypotheses, let us be systematic about how this local harness differs from the real thing. "
       "The README lists the gaps, and each one changes what you can trust.",
"g_b": "Gap one: no GPU, no Docker. The author could not run the real Gemma model here, so the loop has only been tested against the scripted fake. "
       "There is no local data on how the real model behaves: how many turns it takes, how long they take, how it reacts to the nudges.",
"g_c": "Gap two: the graph tools, the analyzer sub agent, skills, and A D K context compaction are all missing locally. "
       "Those names tell you something. The real stack seems to support sub agents, skills and compaction, "
       "which means they may be levers you can pull in a submission. But you will have to test them on the platform, because you cannot run them here.",
"g_d": "Gap three: grading. The task file lacks the fail to pass and pass to pass lists, so required tests are derived from the gold patch. "
       "If the official lists are narrower, you could fail a task locally that you pass officially, or the reverse.",
"g_e": "Gap four: dependencies. The sandbox uses PyPI packages in a virtualenv, not the offline wheelhouse with an editable install, "
       "and only requests and httpx are set up. So rich and fastapi tasks cannot be graded locally yet.",
"g_f": "Gap five: context overflow is only detected, using the reported prompt tokens. It is not handled. On the real platform, compaction may rescue long runs, "
       "so a local overflow may be pessimistic. Keep that in mind when you read the first hypothesis.",
"g_g": "There is also an official check: a wheelhouse dataset on Kaggle, about eight hundred seventy megabytes, which contains the A D K submission package. "
       "Use it to validate your YAML against the real stack before you submit anything.",

# ---------------------------------------------------------------- 10. why 0.08
"s8_a": "Now let us reason about the ninety two percent. An important caveat first. This repo has never run the real Gemma model. "
        "The README says the loop was verified only against a scripted fake server. So everything that follows is a hypothesis to test, "
        "ranked by how well the code supports it.",
"s8_b": "Hypothesis one: context. The window is thirty two thousand tokens, and nothing in this loop ever removes anything from the message list. "
        "A tool result can be up to five thousand characters, roughly twelve hundred to seventeen hundred tokens. "
        "The first prompt might be two to three thousand tokens. Assume a thousand tokens per step, and you hit the ceiling around call thirty. "
        "With larger outputs, around call twenty. The README says context compaction is not implemented locally, "
        "so the forty call budget may be impossible to use.",
"s8_c": "Hypothesis two: time. Four and a half minutes of wall clock for up to eighty turns. A quantized thirty one B model, "
        "generating maybe tens of tokens per second, spends many seconds on every turn, and one pytest run can eat a minute by itself. "
        "Time may well run out before tool calls do. The trace file records a timestamp for every assistant message, so you can measure this instead of guessing.",
"s8_d": "Hypothesis three: the model is flying half blind. The graph tools are declared in the submission and get one sentence in the prompt. "
        "Whether the model uses them well, or wastes calls on badly formed queries, is an open question. Locally, they simply fail.",
"s8_e": "Hypothesis four: thinking is off. A budget of zero keeps turns fast, but smaller models lose a lot of accuracy "
        "on multi file bug localisation without any reasoning. This is a direct trade against hypothesis two, and you need data to choose.",
"s8_f": "Hypothesis five: the prompt optimises for speed over correctness. Smallest diff. One targeted test file. Reasoning in a few sentences. "
        "That is sensible given the budgets, but issue fixing usually goes better if the model reproduces the bug first, and the prompt never asks for that.",
"s8_g": "Hypothesis six: the problem may not be the agent at all. The local verifier approximates the official required tests, "
        "and the sandbox uses PyPI dependencies rather than the offline wheelhouse. Differences like these can flip a result. "
        "Always calibrate the local numbers against a real Kaggle submission.",

# ---------------------------------------------------------------- 9. roadmap
"s9_a": "So what should you actually do first? Not rewrite the prompt. Measure.",
"r_trace": "When you read results, three artifacts matter. Task results dot jsonl has, per task, tool calls, turns, seconds, max prompt tokens and patch size. "
           "The trace holds every assistant message, with a timestamp, token counts and finish reason, and every tool call with its result truncated to two thousand characters. "
           "The test log keeps the last four thousand characters of the pytest output. Together, they tell you which wall was hit, and why.",
"s9_b": "One: serve the real model, with vLLM or any OpenAI compatible endpoint, and run the harness on the three downloaded tasks. "
        "Two: read summary dot json and look at the histogram of failure categories. "
        "If context overflow dominates, build compaction or tighten the outputs. If budget exhausted dominates, make every turn cheaper. "
        "If tests failed dominates, the agent is submitting wrong fixes, so improve localisation and verification. "
        "If loop breakout dominates, fix the nudges and tool schemas. "
        "Three: open the traces and read five failures by hand. Four: change one thing at a time.",
"s9_c": "That is the architecture. A tiny submission bundle. A faithful but imperfect replica of the scorer. "
        "And an agent loop with three hard walls: time, tool calls, and context. Your zero point zero eight lives inside those walls. "
        "The next step is to find out which wall the agent keeps hitting.",
}
