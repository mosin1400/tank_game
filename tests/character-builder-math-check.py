import math
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "characters"))

from character_build_math import maximum_planar_travel_metres


def check(condition, message):
    if not condition:
        raise AssertionError(message)


check(
    math.isclose(
        maximum_planar_travel_metres([(0, 0), (3, 4)], 0.01),
        0.05,
        abs_tol=1e-9,
    ),
    "scene scale must convert Blender units to metres",
)
check(
    math.isclose(
        maximum_planar_travel_metres([(0, 0), (2, 0), (0, 0)], 1.0),
        2.0,
        abs_tol=1e-9,
    ),
    "round-trip root motion must not disappear when first and last frames match",
)
check(
    math.isclose(
        maximum_planar_travel_metres([(-2, 1), (2, 1), (0, 1)], 0.5),
        2.0,
        abs_tol=1e-9,
    ),
    "maximum travel must use the farthest sampled pair",
)
check(
    maximum_planar_travel_metres([], 1.0) == 0.0,
    "empty sampling must report zero travel",
)

try:
    maximum_planar_travel_metres([(0, 0)], 0)
except ValueError as error:
    check("positive" in str(error), "invalid scale error should explain the contract")
else:
    raise AssertionError("zero scene scale must be rejected")

print("PASS: character builder world-space motion math")
