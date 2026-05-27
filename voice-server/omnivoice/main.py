from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
import os
import shutil
import subprocess
import tempfile
import json
from pathlib import Path

app = FastAPI(title="NEO OmniVoice bridge")

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


def _load_profiles() -> dict:
    profiles_path = os.getenv("OMNIVOICE_PROFILES_PATH", "./profiles.example.json")
    p = Path(profiles_path)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}

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
    profile = _load_profiles().get(req.voiceId, {})
    mode = req.mode or profile.get("mode")
    ref_audio = profile.get("refAudioPath")
    if req.refAudioId:
        ref_audio = req.refAudioId
    ref_text = req.refText or profile.get("refText")
    instruct = req.instruct or profile.get("instruct")
    language = req.languageId or profile.get("language") or profile.get("languageId")

    if mode == "clone" and not ref_audio:
        raise HTTPException(status_code=400, detail="clone mode requires refAudioPath in profile or refAudioId in request")
    if mode == "design" and not instruct:
        raise HTTPException(status_code=400, detail="design mode requires instruct in profile or request")

    cmd = [
        cli,
        "--text", req.text,
        "--output", out_path,
    ]
    if ref_audio:
        cmd.extend(["--ref_audio", ref_audio])
    if ref_text:
        cmd.extend(["--ref_text", ref_text])
    if instruct:
        cmd.extend(["--instruct", instruct])
    if language:
        cmd.extend(["--language", language])
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
