#!/usr/bin/env bash
# CPU runtime: everything that needs no GPU, cached on Drive so the G4 runtime only restores and runs.
#   KAGGLE_USERNAME=... KAGGLE_KEY=... bash cpu_prepare.sh          (resumable; each step skips what is already on Drive)
# Drive layout (MyDrive/gemma4-eval):
#   comp/            competition data: tasks.jsonl, snapshots/*.tgz, wheels/, sandbox/setup.py, docker/
#   cache/hvenv.tar  harness env (/content/hvenv: swegemma 0.2.11, adk_submission 0.2.13, google-adk 1.36.1, litellm)
#   cache/sbx.tar    sandbox site (/content/sbx, built by colab_eval.build_sandbox_env)
#   cache/vllm-env.tar  fallback copy of /content/vllm-env (the G4 installs it from PyPI with requirements-vllm.txt)
#   model/           google/gemma-4-31B-it-qat-w4a16-ct (fallback; the G4 downloads from Hugging Face)
#   models/<name>/   the other checkpoints, e.g. gemma-4-12b-it-qat-w4a16-ct (the one $BUNDLE declares, see models.sh)
#   results/gold     reference patches through the official grader: which tasks this environment can solve at all
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
C=/content/comp
PY=3.13.15
BRANCH=${BRANCH:-v9-12b}
mkdir -p $G/cache $G/comp $G/results /content/work
t0=$(date +%s); el() { echo "[$(( $(date +%s) - t0 ))s] $*"; }
cd /content
[ -d Gemma-4 ] || git clone -q -b $BRANCH https://github.com/raut7218/Gemma-4.git
(cd Gemma-4 && git fetch -q origin $BRANCH && git checkout -q -B $BRANCH FETCH_HEAD)
R=/content/Gemma-4/colab_eval
source $R/colab/models.sh; M=$G/$MODEL_DRIVE
command -v uv >/dev/null || pip install -q uv
pip install -q kaggle
uv python install -q $PY

# 1. competition data (Kaggle) -> /content/comp and Drive
if [ ! -s $G/comp/tasks.jsonl ]; then
  el "downloading competition data"
  mkdir -p $C && cd $C
  kaggle competitions download gemma-4-developer-agent -p $C -q
  unzip -q -o gemma-4-developer-agent.zip 'tasks.jsonl' 'snapshots/*' 'wheels/*' 'sandbox/*' 'docker/*' 'HARNESS_README.md' && rm -f gemma-4-developer-agent.zip
  el "copying competition data to Drive"
  cp -r $C/tasks.jsonl $C/wheels $C/sandbox $C/docker $C/HARNESS_README.md $G/comp/
  mkdir -p $G/comp/snapshots && ls $C/snapshots | xargs -P 8 -I{} cp $C/snapshots/{} $G/comp/snapshots/{}
  cd /content
elif [ ! -s $C/tasks.jsonl ]; then
  bash $R/colab/restore_comp.sh
fi
el "data: $(wc -l < $C/tasks.jsonl) tasks, $(ls $C/snapshots | wc -l) snapshots"

# 1b. wheels pinned to the era of the tasks whose reference patch fails against the newest packages (era_pins.json)
if [ ! -d $G/comp/era_wheels ]; then
  (cd /content/Gemma-4 && python3 -m colab_eval.era_pins fetch $C/era_wheels) && cp -r $C/era_wheels $G/comp/
fi
[ -d $C/era_wheels ] || cp -r $G/comp/era_wheels $C/

# 2. harness env: scorer wheels from the Kaggle wheelhouse + requirements-harness.txt
if [ ! -s $G/cache/hvenv.tar ]; then
  mkdir -p /content/wh && cd /content/wh
  for w in swegemma-0.2.11 adk_submission-0.2.13 adk_eval_core-0.1.0; do
    kaggle datasets download metric/gemma-4-developer-agent-wheelhouse -f $w-py3-none-any.whl -p . -q
    [ -f $w-py3-none-any.whl ] || unzip -q -o $w-py3-none-any.whl.zip
  done
  cd /content
  uv venv -q --clear --python $PY /content/hvenv
  uv pip install -q --python /content/hvenv/bin/python -r $R/requirements-harness.txt
  uv pip install -q --python /content/hvenv/bin/python --no-deps /content/wh/*.whl
  tar -cf $G/cache/hvenv.tar -C /content hvenv
fi
[ -x /content/hvenv/bin/python ] || tar -xf $G/cache/hvenv.tar -C /content
el "harness env ok: $(/content/hvenv/bin/python -c 'import swegemma, adk_submission, google.adk; print(google.adk.__version__)')"

# 3. sandbox site (same path on every runtime, so the tar needs no relocation)
if [ ! -s $G/cache/sbx.tar ]; then
  (cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.build_sandbox_env --data $C --out /content/sbx)
  tar -cf $G/cache/sbx.tar -C /content sbx
fi
[ -x /content/sbx/bin/python3 ] || tar -xf $G/cache/sbx.tar -C /content
el "sandbox site ok"

# 4. vLLM env: installed and import-checked here, tar kept on Drive as the fallback for the G4
if [ ! -s $G/cache/vllm-env.tar ]; then
  uv venv -q --clear --python 3.12 /content/vllm-env
  uv pip install -q --no-deps --python /content/vllm-env/bin/python -r $R/requirements-vllm.txt
  /content/vllm-env/bin/python -c "import vllm, transformers; print('vllm', vllm.__version__, 'transformers', transformers.__version__)"
  tar -cf $G/cache/vllm-env.tar -C /content vllm-env
fi
el "vllm env cached"

# 5. model weights on Drive (fallback; the G4 pulls from Hugging Face first)
[ -x /content/vllm-env/bin/hf ] || tar -xf $G/cache/vllm-env.tar -C /content
if [ ! -s $M/model.safetensors ]; then
  /content/vllm-env/bin/hf download $HF_REPO --local-dir /content/model > /content/work/hf.log 2>&1
  mkdir -p $M && cp /content/model/*.json /content/model/*.jinja $M/ && cp /content/model/model.safetensors $M/
fi
el "model on Drive: $MODEL_NAME $(du -sh $M | cut -f1)"
# the scorer's vLLM must know the architecture it is told to load (the 12B is served with --hf-overrides)
/content/vllm-env/bin/python - "$M" "${MODEL_ARGS[@]}" <<'PY'
import json, sys
from vllm.model_executor.models.registry import ModelRegistry
cfg = json.load(open(sys.argv[1] + '/config.json'))
over = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
arch = (over.get('architectures') or cfg['architectures'])[0]
assert arch in ModelRegistry.get_supported_archs(), f'vLLM has no {arch}'
print('vLLM supports', arch, '| checkpoint', cfg['architectures'][0], cfg.get('model_type'), '| overrides', over or None)
PY

# 6. gold validation through the official grader (resumable)
if [ ! -s $G/results/gold/summary.json ]; then
  mkdir -p /content/results && { [ -d $G/results/gold ] && cp -r $G/results/gold /content/results/ || true; }
  (cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.run_official --agent gold --data $C --sandbox-site /content/sbx \
     --results-dir /content/results/gold --concurrency ${GOLD_WORKERS:-2} --resume 2>&1 | grep -v -i warning | tail -3)
  mkdir -p $G/results && cp -r /content/results/gold $G/results/
fi
python3 - <<'PY'
import json, collections
rs = [json.loads(l) for l in open('/content/drive/MyDrive/gemma4-eval/results/gold/task_results.jsonl')]
c = collections.Counter((r['repo'], r['resolved']) for r in rs)
print('gold:', sum(r['resolved'] for r in rs), '/', len(rs), dict(c))
PY
el "cpu_prepare done"
