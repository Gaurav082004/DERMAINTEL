import os
from pathlib import Path
from huggingface_hub import snapshot_download

REPO_ID = os.getenv("HF_REPO_ID", "Zyrus08/dermaintel-models")
HF_TOKEN = os.getenv("HF_TOKEN")

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN environment variable is not set.")

print(f"Downloading models from Hugging Face: {REPO_ID}")

snapshot_download(
    repo_id=REPO_ID,
    repo_type="model",
    token=HF_TOKEN,
    local_dir=str(ARTIFACTS_DIR),
    allow_patterns=[
        "feature_scaler.pkl",
        "mlp_model.keras",
        "skin_model_final_v3_TTA.keras",
    ],
)

print("All model artifacts downloaded successfully.")