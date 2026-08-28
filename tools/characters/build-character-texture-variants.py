"""Build nine detail-preserving soldier albedo variants from the licensed source texture."""

import json
from pathlib import Path

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/raw-character/donor/russian-soldier/package/source/soldier/sov_soldier_0_co.png"
OUTPUT = ROOT / "assets/models/characters/textures/variants"

VARIANTS = {
    "commander-olive": (0.22, 0.26, 0.10),
    "crew-forest": (0.16, 0.23, 0.10),
    "crew-khaki": (0.34, 0.31, 0.16),
    "crew-sage": (0.29, 0.34, 0.20),
    "scout-muted": (0.20, 0.27, 0.18),
    "officer-charcoal": (0.16, 0.17, 0.14),
    "vardan-field": (0.27, 0.31, 0.15),
    "ash-field": (0.25, 0.22, 0.16),
    "civilian-earth": (0.30, 0.24, 0.17),
}

ROLE_VARIANTS = {
    "player-commander": "commander-olive", "ramin": "crew-forest",
    "saman": "crew-khaki", "nikan": "crew-sage", "arad": "crew-forest",
    "major-mehraz": "officer-charcoal", "shahin-tali": "scout-muted",
    "general-varen": "officer-charcoal", "soroush-amani": "commander-olive",
    "mehran": "crew-khaki", "nader-rostami": "scout-muted",
    "vardan-rifleman": "vardan-field", "vardan-tanker": "crew-forest",
    "vardan-engineer": "crew-khaki", "ash-rifleman": "ash-field",
    "ash-elite": "officer-charcoal", "ash-crew": "ash-field",
    "convoy-driver": "civilian-earth", "mechanic": "crew-khaki",
    "rail-worker": "civilian-earth", "resistance": "scout-muted", "medic": "crew-sage",
}


def recolor(source: np.ndarray, target_rgb: tuple[float, float, float]) -> np.ndarray:
    result = source.copy()
    rgb = result[:, :, :3]
    luminance = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = (maximum - minimum) / np.maximum(maximum, 0.001)

    # Preserve exposed skin, leather, insignia and near-black seams. Recolour mostly cloth.
    skin = (rgb[:, :, 0] > rgb[:, :, 1] * 1.08) & (rgb[:, :, 1] > rgb[:, :, 2] * 1.06) & (rgb[:, :, 0] > 0.28)
    cloth = (~skin) & (luminance > 0.055) & (saturation < 0.78)

    target = np.asarray(target_rgb, dtype=np.float32)
    target_luma = float(target @ np.asarray([0.2126, 0.7152, 0.0722]))
    shaded_target = np.clip(target[None, None, :] * (luminance[:, :, None] / max(target_luma, 0.01)), 0.0, 1.0)
    blend = np.where(cloth, 0.72, 0.0)[:, :, None]
    rgb[:] = rgb * (1.0 - blend) + shaded_target * blend
    return np.clip(result, 0.0, 1.0)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image = bpy.data.images.load(str(SOURCE), check_existing=False)
    image.colorspace_settings.name = "sRGB"
    width, height = image.size
    pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape((height, width, 4))

    if (width, height) != (1024, 1024):
        image.scale(1024, 1024)
        width, height = image.size
        pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape((height, width, 4))

    manifest_variants = {}
    for variant_id, target in VARIANTS.items():
        output_image = bpy.data.images.new(variant_id, width=1024, height=1024, alpha=True)
        output_image.pixels.foreach_set(recolor(pixels, target).reshape(-1))
        output_image.filepath_raw = str(OUTPUT / f"{variant_id}.png")
        output_image.file_format = "PNG"
        output_image.save()
        bpy.data.images.remove(output_image)
        manifest_variants[variant_id] = {
            "albedo": f"assets/models/characters/textures/variants/{variant_id}.png",
            "sourceMaterial": "sov_soldier_0",
        }

    manifest = {"schemaVersion": 1, "variants": manifest_variants, "roles": ROLE_VARIANTS}
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"built {len(VARIANTS)} variants for {len(ROLE_VARIANTS)} roles")


if __name__ == "__main__":
    main()
