# OmniVoice backend scaffold

This service is intentionally separate from the Android APK. Run it as Python/FastAPI.

## Endpoints
- `GET /health`
- `POST /tts` with body `{voiceId,text,mode,refAudioId?,refText?,instruct?,languageId?,speed?,duration?}`

## Run
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8011
```

Point app env:
`NEXT_PUBLIC_OMNIVOICE_BASE_URL=http://localhost:8011`

This scaffold now checks for `omnivoice-infer` on PATH.
- If missing: `/health` returns `status: not_configured` and `/tts` returns HTTP 503.
- If present: `/health` returns `status: ok` and `/tts` attempts real generation via CLI.


## Real OmniVoice setup requirements
1. Python 3.10+ on Linux/macOS.
2. Install dependencies: `pip install -r requirements.txt` (this installs `omnivoice` and `omnivoice-infer`).
3. Optional but recommended: NVIDIA GPU with recent CUDA driver. CPU-only inference works but is much slower.
4. For clone mode, provide a real WAV reference path via `profiles.json` (`refAudioPath`) or request `refAudioId` (treated as a local file path).
5. First run downloads model weights from HuggingFace (`k2-fsa/OmniVoice`), so outbound internet access is required.

## Validate real audio generation locally
```bash
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8011
curl -s http://127.0.0.1:8011/health
curl -s -X POST http://127.0.0.1:8011/tts \
  -H 'content-type: application/json' \
  -d '{"voiceId":"villain","text":"Validation speech from OmniVoice","mode":"design"}' \
  | jq -r '.audioBase64' | base64 -d > /tmp/omnivoice_validation.wav
python - <<'PY'
import wave
w = wave.open("/tmp/omnivoice_validation.wav", "rb")
print({"channels": w.getnchannels(), "sample_rate": w.getframerate(), "frames": w.getnframes()})
w.close()
PY
```
Expected `file` output should report a RIFF/WAVE audio file.
