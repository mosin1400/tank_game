"""Pure math helpers shared by the Blender character builder and its tests."""

import math


def maximum_planar_travel_metres(points, scene_scale_metres):
    """Return the farthest sampled XY displacement converted to metres."""
    if not math.isfinite(scene_scale_metres) or scene_scale_metres <= 0:
        raise ValueError("scene unit scale must be a positive metre conversion")
    maximum = 0.0
    for index, (x1, y1) in enumerate(points):
        for x2, y2 in points[index + 1:]:
            maximum = max(maximum, math.hypot(x2 - x1, y2 - y1))
    return maximum * scene_scale_metres
