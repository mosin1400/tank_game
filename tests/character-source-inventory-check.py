"""Contract for the ignored MakeHuman and Mixamo source inventory."""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
RECIPE_PATH = ROOT / "tools/characters/recipes/commander-medium.json"
RAW_ROOT = ROOT / "tools/raw-character"

FILES = [
    "makehuman/commander-medium-unrigged.fbx",
    "mixamo/t-pose-with-skin.fbx",
    "mixamo/idle.fbx",
    "mixamo/walking.fbx",
    "mixamo/running.fbx",
    "mixamo/crouch-walking.fbx",
    "mixamo/talking.fbx",
    "mixamo/pointing.fbx",
    "mixamo/standing-react-small-from-right.fbx",
    "mixamo/sitting-idle.fbx",
    "mixamo/repairing.fbx",
    "mixamo/rifle-aiming-idle.fbx",
    "mixamo/reloading.fbx",
    "mixamo/hit-reaction.fbx",
    "mixamo/falling-back-death.fbx",
]
AUXILIARY_FILES = ["makehuman/commander-medium.mhm"]
MIXAMO_BINARY_HEADER = b"Kaydara FBX Binary  \x00\x1a\x00"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_relative_file(value: object, label: str) -> str:
    require(isinstance(value, str) and bool(value), f"{label} must be a non-empty string")
    candidate = PurePosixPath(value)
    require(not candidate.is_absolute(), f"{label} must be relative: {value}")
    require(".." not in candidate.parts, f"{label} may not escape raw root: {value}")
    require("\\" not in value, f"{label} must use POSIX separators: {value}")
    return value


def require_license(record: object, label: str) -> None:
    require(isinstance(record, dict), f"{label} must be an object")
    license_record = record.get("license")
    require(isinstance(license_record, dict), f"{label}.license must be an object")
    for field in ("name", "url"):
        require(
            isinstance(license_record.get(field), str) and bool(license_record[field]),
            f"{label}.license.{field} is required",
        )


def main() -> None:
    schema_only = "--schema-only" in sys.argv[1:]
    unexpected_args = set(sys.argv[1:]) - {"--schema-only"}
    require(not unexpected_args, f"Unknown arguments: {sorted(unexpected_args)}")
    require(RECIPE_PATH.is_file(), f"Missing recipe: {RECIPE_PATH.relative_to(ROOT)}")
    recipe = json.loads(RECIPE_PATH.read_text(encoding="utf-8"))

    require(recipe.get("schemaVersion") == 1, "schemaVersion must be 1")
    require(recipe.get("id") == "commander-medium", "recipe id must be commander-medium")
    require(recipe.get("rawRoot") == "tools/raw-character", "rawRoot must be tools/raw-character")
    require(recipe.get("status") in {"pending-ui-acquisition", "complete"}, "invalid recipe status")

    makehuman = recipe.get("makehuman")
    require(isinstance(makehuman, dict), "makehuman must be an object")
    require(makehuman.get("version") == "1.3.0", "MakeHuman version must be 1.3.0")
    require(makehuman.get("sex") == "male", "MakeHuman character must be male")
    require(makehuman.get("age") == "adult", "MakeHuman character must be adult")
    require(makehuman.get("bodyClass") == "medium", "bodyClass must be medium")
    require(makehuman.get("topology") == "Game Engine", "topology must be Game Engine")
    require(makehuman.get("units") == "metres", "units must be metres")
    require(makehuman.get("feetOnGround") is True, "feetOnGround must be true")
    require(makehuman.get("rig") == "none", "MakeHuman FBX must be unrigged")
    require_relative_file(makehuman.get("file"), "makehuman.file")

    assets = makehuman.get("assets")
    require(isinstance(assets, list) and len(assets) == 5, "five MakeHuman core assets are required")
    required_slots = {"skin", "shirt", "trousers", "shoes", "topology"}
    require({asset.get("slot") for asset in assets if isinstance(asset, dict)} == required_slots,
            "MakeHuman assets must cover skin, shirt, trousers, shoes and topology")
    for index, asset in enumerate(assets):
        label = f"makehuman.assets[{index}]"
        require(isinstance(asset, dict), f"{label} must be an object")
        require("identifier" in asset, f"{label}.identifier key is required")
        if not schema_only:
            require(isinstance(asset.get("identifier"), str) and bool(asset["identifier"]),
                    f"{label}.identifier is required")
        require(asset.get("bundledCore") is True, f"{label} must be bundled/core")
        require("metadataEvidence" in asset, f"{label}.metadataEvidence key is required")
        if not schema_only:
            require(isinstance(asset.get("metadataEvidence"), str) and bool(asset["metadataEvidence"]),
                    f"{label}.metadataEvidence is required")
        require_license(asset, label)
        require(asset["license"]["name"] == "CC0", f"{label} license must be CC0")

    mixamo = recipe.get("mixamo")
    require(isinstance(mixamo, dict), "mixamo must be an object")
    require_license(mixamo, "mixamo")
    downloads = mixamo.get("downloads")
    require(isinstance(downloads, list) and len(downloads) == 14,
            "Mixamo inventory must contain one T-pose and thirteen clips")

    recipe_files = [makehuman["file"]]
    for index, download in enumerate(downloads):
        label = f"mixamo.downloads[{index}]"
        require(isinstance(download, dict), f"{label} must be an object")
        recipe_files.append(require_relative_file(download.get("file"), f"{label}.file"))
        for field in ("displayedTitle", "acquired"):
            require(field in download, f"{label}.{field} key is required")
            if not schema_only:
                require(isinstance(download.get(field), str) and bool(download[field]),
                        f"{label}.{field} is required")
        if not schema_only:
            try:
                acquired = date.fromisoformat(download["acquired"])
            except ValueError as exc:
                raise AssertionError(f"{label}.acquired must be YYYY-MM-DD") from exc
            require(acquired <= date.today(), f"{label}.acquired may not be in the future")
        settings = download.get("settings")
        require(isinstance(settings, dict), f"{label}.settings must be an object")
        require(settings.get("format") == "FBX Binary", f"{label} must use FBX Binary")
        require(settings.get("fps") == 30, f"{label} must use 30 FPS")

    require(recipe_files == FILES, "recipe file order/names must match the approved inventory")
    require(downloads[0]["settings"].get("skin") == "With Skin", "T-pose must include skin")
    for index, download in enumerate(downloads[1:], start=1):
        require(download["settings"].get("skin") == "Without Skin",
                f"mixamo.downloads[{index}] must exclude skin")
        expected_in_place = download["file"] in {
            "mixamo/walking.fbx",
            "mixamo/running.fbx",
            "mixamo/crouch-walking.fbx",
        }
        require(download["settings"].get("inPlace") is expected_in_place,
                f"mixamo.downloads[{index}] inPlace mismatch")

    if schema_only:
        print("character source recipe schema: PASS (acquisition may still be pending)")
        return

    require(recipe.get("status") == "complete", "recipe status must be complete after acquisition")
    expected_paths = {PurePosixPath(relative) for relative in FILES + AUXILIARY_FILES}
    actual_fbx = {
        PurePosixPath(path.relative_to(RAW_ROOT).as_posix())
        for path in RAW_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() == ".fbx"
    } if RAW_ROOT.is_dir() else set()
    require(actual_fbx == {path for path in expected_paths if path.suffix == ".fbx"},
            f"raw FBX names differ; expected exact normalized inventory, got {sorted(map(str, actual_fbx))}")

    for relative in FILES + AUXILIARY_FILES:
        source = RAW_ROOT / relative
        require(source.is_file(), f"Missing raw source: tools/raw-character/{relative}")
        require(source.stat().st_size > 1024, f"Raw source is suspiciously small: {relative}")

    for relative in FILES[1:]:
        source = RAW_ROOT / relative
        with source.open("rb") as stream:
            require(stream.read(len(MIXAMO_BINARY_HEADER)) == MIXAMO_BINARY_HEADER,
                    f"Mixamo source is not FBX Binary: {relative}")

    print("character source inventory: PASS")


if __name__ == "__main__":
    main()
