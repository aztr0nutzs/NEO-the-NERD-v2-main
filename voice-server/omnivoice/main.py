from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
import os
import shutil
import subprocess
import tempfile

app = FastAPI(title="NEO OmniVoice bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("OMNIVOICE_CORS_ALLOW_ORIGINS", "*").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    voiceId: str
    text: str
    mode: Literal["clone", "design"]
    refAudioId: Optional[str] = None
    refText: Optional[str] = None
    instruct: Optional[str] = None
    languageId: Optional[str] = None
    speed: Optional[float] = None
    duration: Optional[float] = None

@app.get('/health')
def health():
    cli = shutil.which("omnivoice-infer")
    if not cli:
        return {"ok": False, "provider": "omnivoice", "status": "not_configured", "error": "OmniVoice engine not installed/configured"}
    return {"ok": True, "provider": "omnivoice", "status": "ok"}

@app.post('/tts')
def tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    cli = shutil.which("omnivoice-infer")
    if not cli:
        raise HTTPException(status_code=503, detail="OmniVoice engine not installed/configured")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_file:
        out_path = out_file.name
    cmd = [
        cli,
        "--text", req.text,
        "--mode", req.mode,
        "--voice-id", req.voiceId,
        "--output", out_path,
    ]
    if req.refAudioId:
        cmd.extend(["--ref-audio-id", req.refAudioId])
    if req.refText:
        cmd.extend(["--ref-text", req.refText])
    if req.instruct:
        cmd.extend(["--instruct", req.instruct])
    if req.languageId:
        cmd.extend(["--language-id", req.languageId])
    if req.speed is not None:
        cmd.extend(["--speed", str(req.speed)])
    if req.duration is not None:
        cmd.extend(["--duration", str(req.duration)])
    try:
        subprocess.run(cmd, check=True, timeout=int(os.getenv("OMNIVOICE_TIMEOUT_SEC", "45")))
        with open(out_path, "rb") as f:
            import base64
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")
        return {"audioBase64": audio_b64, "mimeType": "audio/wav", "fileName": f"{req.voiceId}.wav", "provider": "omnivoice", "providerVoiceId": req.voiceId}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"OmniVoice generation failed: {exc}")
