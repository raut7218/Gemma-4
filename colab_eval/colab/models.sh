# Sourced by the Colab scripts: which checkpoint to serve, as the scorer does (HARNESS_README 3.1).
# MODEL_NAME defaults to the model declared in $BUNDLE/agent.yaml (BUNDLE defaults to submission); swegemma sends
# requests to openai/<that name>, so it is also vLLM's --served-model-name.
#   HF_REPO      Hugging Face repo of the checkpoint
#   MODEL_ARGS   extra vLLM args (MODEL_VLLM_EXTRA_ARGS in scripts/inference.py)
#   MODEL_DRIVE  Drive cache of the weights (the 31B predates models/ and stays at model/)
#   L4_TPS       analyze.py's single-request 4x L4 estimate: "decode prefill" tok/s (rough, not measured)
#   SKIP_WEIGHTS extra checkpoint prefix vLLM's text-only Gemma4ForCausalLM must skip (serve_vllm.sh adds it)
_bundle_yaml="${REPO_DIR:-/content/Gemma-4}/${BUNDLE:-submission}/agent.yaml"
MODEL_NAME="${MODEL_NAME:-$(sed -n 's/^model: *//p' "$_bundle_yaml" 2>/dev/null | head -1)}"
MODEL_NAME="${MODEL_NAME:-gemma-4-31b-it-qat-w4a16-ct}"
case "$MODEL_NAME" in
  gemma-4-31b-it-qat-w4a16-ct)
    HF_REPO=google/gemma-4-31B-it-qat-w4a16-ct; MODEL_ARGS=(); MODEL_DRIVE=model; L4_TPS="20 1500"; SKIP_WEIGHTS= ;;
  gemma-4-12b-it-qat-w4a16-ct)
    HF_REPO=google/gemma-4-12B-it-qat-w4a16-ct; MODEL_DRIVE=models/$MODEL_NAME; L4_TPS="45 3500"
    # the HF export (gemma4_unified) names its vision patch embedder model.vision_embedder.*, which vLLM 0.19.1 only
    # skips under the older names (vision_tower., embed_vision.); the text weights are untouched
    SKIP_WEIGHTS=vision_embedder.
    MODEL_ARGS=(--hf-overrides '{"architectures": ["Gemma4ForCausalLM"], "model_type": "gemma4"}') ;;
  *) echo "models.sh: unknown model $MODEL_NAME" >&2; return 1 ;;
esac
