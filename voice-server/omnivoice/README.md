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

Replace placeholder audio generation with `omnivoice-infer` subprocess or Python API in your environment.
