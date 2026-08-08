"""Contract for the offline Blender character-rig build pipeline."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "characters" / "build-rigged-character-cast.py"


def main():
    assert SCRIPT.is_file(), "Missing the repeatable Blender cast builder."
    source = SCRIPT.read_text(encoding="utf-8")

    for role in (
        "player-commander",
        "ramin",
        "saman",
        "nikan",
        "shahin-tali",
        "general-varen",
    ):
        assert role in source, f"The main-cast build does not include {role}."

    assert "player-commander-rigged.fbx" in source
    assert "DATA_TRANSFER" in source, "Weight transfer must be explicit and repeatable."
    assert "outfit" in source.lower(), "Each cast member needs authored clothing."
    assert "export_scene.gltf" in source, "The pipeline must export production GLB assets."
    assert "from mathutils import Vector" in source, "Blender bone offsets must use Vector values."
    assert "mixamorig:" in source, "Outfit attachments must target the actual Mixamo bone names."

    print("character rig builder contract: PASS")


if __name__ == "__main__":
    main()
