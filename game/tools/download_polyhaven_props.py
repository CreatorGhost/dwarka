"""Download 1K glTF packages from the Poly Haven API (CC0)."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW = REPO_ROOT / "game/assets/raw/polyhaven"
UA = "DWARKA-AssetScout/1.0 (CC0 archival; chapter-1)"

ASSETS = (
    "brass_diya_lantern",
    "brass_vase_03",
    "brass_vase_02",
    "planter_pot_clay",
    "wicker_basket_01",
    "wooden_bucket_01",
    "moonlit_golf",
)


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode())


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as response, dest.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pick_gltf(files: dict) -> tuple[str, dict]:
    gltf = files.get("gltf") or {}
    for res in ("1k", "2k", "4k"):
        if res in gltf and "gltf" in gltf[res]:
            return res, gltf[res]["gltf"]
    raise RuntimeError("no gltf package")


def save_gltf(asset_id: str) -> dict:
    files = fetch_json(f"https://api.polyhaven.com/files/{asset_id}")
    if "hdri" in files:
        dest = RAW / f"{asset_id}_2k.hdr"
        url = files["hdri"]["2k"]["hdr"]["url"]
        download(url, dest)
        return {"id": asset_id, "kind": "hdri", "path": str(dest.relative_to(REPO_ROOT)), "sha256": sha256(dest), "bytes": dest.stat().st_size, "url": url}
    res, package = pick_gltf(files)
    out_dir = RAW / asset_id
    gltf_name = Path(package["url"]).name
    gltf_path = out_dir / gltf_name
    download(package["url"], gltf_path)
    saved = [str(gltf_path.relative_to(REPO_ROOT))]
    for rel, meta in (package.get("include") or {}).items():
        target = out_dir / rel
        download(meta["url"], target)
        saved.append(str(target.relative_to(REPO_ROOT)))
    return {
        "id": asset_id,
        "kind": "gltf",
        "resolution": res,
        "path": str(gltf_path.relative_to(REPO_ROOT)),
        "sha256": sha256(gltf_path),
        "bytes": gltf_path.stat().st_size,
        "files": saved,
        "url": f"https://polyhaven.com/a/{asset_id}",
    }


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    results = [save_gltf(asset_id) for asset_id in ASSETS]
    report = REPO_ROOT / "game/assets/work/polyhaven-scout-download.json"
    report.write_text(json.dumps({"schemaVersion": 1, "assets": results}, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
