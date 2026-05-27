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
