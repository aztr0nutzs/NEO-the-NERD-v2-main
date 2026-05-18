"""Validate the Prankster sound catalog and assets.

Checks:
  * every catalog assetPath exists
  * file extension is supported (.ogg/.mp3/.wav)
  * file magic header is valid
  * file body shows no UTF-8 replacement-character corruption
  * catalog ids are unique
  * catalog assetPaths are unique
  * no audio file in sounds/ is uncataloged
  * required catalog fields are present and non-empty
"""
from __future__ import annotations
import json, os, sys

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT, 'app', 'src', 'main', 'assets')
CATALOG    = os.path.join(ASSETS_DIR, 'sound_catalog.json')
SOUNDS_DIR = os.path.join(ASSETS_DIR, 'sounds')

SUPPORTED = {'.ogg', '.mp3', '.wav'}
REQUIRED_FIELDS = ('id', 'name', 'category', 'packId', 'assetPath',
                   'tags', 'loopable', 'isSafeForRandomMode')
# UTF-8-corrupted MP3s start with U+FFFD (EF BF BD); valid MP3s start with ID3 or 0xFF Ex.
REPLACEMENT = b'\xef\xbf\xbd'

def header_ok(path: str) -> tuple[bool, str]:
    with open(path, 'rb') as fh:
        head = fh.read(16)
    ext = os.path.splitext(path)[1].lower()
    if ext == '.ogg':
        if head[:4] != b'OggS':
            return False, f'expected OggS, got {head[:4]!r}'
    elif ext == '.mp3':
        if not (head[:3] == b'ID3' or (head[:1] == b'\xff' and (head[1] & 0xE0) == 0xE0)):
            return False, f'expected ID3/MPEG sync, got {head[:8].hex()}'
    elif ext == '.wav':
        if not (head[:4] == b'RIFF' and head[8:12] == b'WAVE'):
            return False, 'not a RIFF/WAVE file'
    return True, ''

def utf8_corruption(path: str, threshold: float = 0.10) -> tuple[bool, float]:
    """True if file content is UTF-8-encoded binary (TTS-substitute / corruption)."""
    with open(path, 'rb') as fh:
        data = fh.read()
    if not data:
        return True, 0.0
    repl = data.count(REPLACEMENT)
    density = repl * 3 / len(data)
    return density >= threshold, density

def list_audio_files(root: str):
    out = []
    for r, _, fs in os.walk(root):
        for f in fs:
            if os.path.splitext(f)[1].lower() in SUPPORTED:
                p = os.path.join(r, f)
                rel = os.path.relpath(p, ASSETS_DIR).replace(os.sep, '/')
                out.append(rel)
    return out

def main() -> int:
    if not os.path.exists(CATALOG):
        print(f'FAIL: missing catalog {CATALOG}')
        return 2
    catalog = json.load(open(CATALOG, encoding='utf-8'))
    print(f'catalog entries: {len(catalog)}')

    errs, warns = [], []

    # 1. id / assetPath uniqueness + required fields
    seen_ids, seen_paths = set(), set()
    for i, e in enumerate(catalog):
        for f in REQUIRED_FIELDS:
            if f not in e or e[f] in (None, ''):
                errs.append(f'entry[{i}] missing field {f}')
        eid = e.get('id'); ap = e.get('assetPath')
        if eid in seen_ids: errs.append(f'duplicate id: {eid}')
        if ap in seen_paths: errs.append(f'duplicate assetPath: {ap}')
        seen_ids.add(eid); seen_paths.add(ap)

    # 2. file existence + extension + magic + corruption
    missing, unsupported, bad_header, corrupt = [], [], [], []
    for e in catalog:
        ap = e.get('assetPath', '')
        full = os.path.join(ASSETS_DIR, ap.replace('/', os.sep))
        if not os.path.exists(full):
            missing.append(ap); continue
        ext = os.path.splitext(ap)[1].lower()
        if ext not in SUPPORTED:
            unsupported.append((ap, ext)); continue
        ok, why = header_ok(full)
        if not ok:
            bad_header.append((ap, why)); continue
        is_corrupt, density = utf8_corruption(full)
        if is_corrupt:
            corrupt.append((ap, f'replacement-char density {density:.1%}'))

    # 3. uncataloged audio on disk
    on_disk = set(list_audio_files(SOUNDS_DIR))
    cataloged = set(seen_paths)
    uncataloged = sorted(on_disk - cataloged)
    orphans   = sorted(cataloged - on_disk)

    print(f'missing files:        {len(missing)}')
    for m in missing[:5]: print('  ', m)
    print(f'unsupported ext:      {len(unsupported)}')
    for u in unsupported[:5]: print('  ', u)
    print(f'bad headers:          {len(bad_header)}')
    for b in bad_header[:5]: print('  ', b)
    print(f'utf-8 corrupted:      {len(corrupt)}')
    for c in corrupt[:5]: print('  ', c)
    print(f'uncataloged on disk:  {len(uncataloged)}')
    for u in uncataloged[:5]: print('  ', u)
    print(f'orphan catalog rows:  {len(orphans)}')
    for o in orphans[:5]: print('  ', o)

    errs += [f'missing: {m}' for m in missing]
    errs += [f'unsupported: {u}' for u in unsupported]
    errs += [f'bad header: {b}' for b in bad_header]
    errs += [f'corrupt: {c}' for c in corrupt]
    errs += [f'uncataloged audio: {u}' for u in uncataloged]
    errs += [f'orphan catalog row: {o}' for o in orphans]

    if errs:
        print(f'\nVALIDATION FAILED with {len(errs)} error(s)')
        return 1
    print('\nVALIDATION OK')
    return 0

if __name__ == '__main__':
    sys.exit(main())
