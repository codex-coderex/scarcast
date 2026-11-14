"""Shared utilities for reading and exporting NISAR raster data.

AOI means area of interest: the polygon that selects which pixels to read.
"""

import json
from pathlib import Path
from urllib.parse import unquote, urlparse

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.transform import array_bounds, from_origin
from rasterio.warp import transform_bounds, transform_geom


DATA_DIR = Path(__file__).resolve().parent / "data"
GEOGRAPHIC_CRS = "EPSG:4326"


def validate_aoi(aoi_points):
    """Validate a closed longitude/latitude ring and return its coordinates."""
    points = np.asarray(aoi_points, dtype=float)

    # Each row must contain one longitude/latitude pair.
    if (
        points.ndim != 2
        or points.shape[1] != 2
        or len(points) < 4
        or not np.isfinite(points).all()
    ):
        raise ValueError("AOI must be a closed ring of longitude/latitude pairs.")

    # A closed polygon starts and ends at the same point.
    if not np.array_equal(points[0], points[-1]):
        raise ValueError("AOI must be a closed ring of longitude/latitude pairs.")

    west, south = points.min(axis=0)
    east, north = points.max(axis=0)

    if west >= east or south >= north:
        raise ValueError("AOI must have nonzero width and height.")

    return points


def read_aoi_grid(group, points, source):
    """Find the raster window and pixel mask that cover the AOI polygon."""
    x_axis = group["xCoordinates"]
    y_axis = group["yCoordinates"]
    shape = (len(y_axis), len(x_axis))

    if min(shape) < 2:
        raise ValueError("Expected a two-dimensional geocoded raster grid.")

    first_x = float(x_axis[0])
    first_y = float(y_axis[0])
    x_spacing = float(x_axis[1]) - first_x
    y_spacing = float(y_axis[1]) - first_y

    # In a north-up grid, x increases to the right and y decreases downward.
    coordinates_are_finite = np.isfinite(
        [first_x, first_y, x_spacing, y_spacing]
    ).all()

    if not coordinates_are_finite or x_spacing <= 0 or y_spacing >= 0:
        raise ValueError("Expected a regular north-up geocoded raster grid.")

    crs = f"EPSG:{int(group['projection'].attrs['epsg_code'])}"
    west, south = points.min(axis=0)
    east, north = points.max(axis=0)

    # Convert longitude/latitude bounds to the raster's coordinate system.
    west, south, east, north = transform_bounds(
        GEOGRAPHIC_CRS,
        crs,
        west,
        south,
        east,
        north,
        densify_pts=21,
    )

    # Keep a small buffer around the AOI. Slice stops are exclusive.
    column_start = max(0, int(np.floor((west - first_x) / x_spacing)) - 2)
    column_stop = min(shape[1], int(np.ceil((east - first_x) / x_spacing)) + 3)
    row_start = max(0, int(np.floor((north - first_y) / y_spacing)) - 2)
    row_stop = min(shape[0], int(np.ceil((south - first_y) / y_spacing)) + 3)

    if column_start >= column_stop or row_start >= row_stop:
        raise ValueError(f"AOI not covered by {source}")

    # HDF5 coordinates mark pixel centers; the affine uses outer edges.
    # This transform maps pixel positions to coordinates on the ground.
    affine = from_origin(
        first_x + column_start * x_spacing - x_spacing / 2,
        first_y + row_start * y_spacing - y_spacing / 2,
        x_spacing,
        abs(y_spacing),
    )

    geometry = {
        "type": "Polygon",
        "coordinates": [points.tolist()],
    }
    projected_geometry = transform_geom(GEOGRAPHIC_CRS, crs, geometry)
    window_shape = (row_stop - row_start, column_stop - column_start)

    # True marks pixels whose centers fall inside the polygon.
    area = geometry_mask(
        [projected_geometry],
        out_shape=window_shape,
        transform=affine,
        invert=True,
    )

    if not area.any():
        raise ValueError("No pixel centers fall inside the AOI.")

    row_slice = slice(row_start, row_stop)
    column_slice = slice(column_start, column_stop)

    return {
        "window": (row_slice, column_slice),
        "shape": shape,
        "crs": crs,
        "transform": affine,
        "area": area,
        "aoi": geometry,
    }


def geographic_bounds(shape, transform, crs):
    """Return raster bounds in geographic [[south, west], [north, east]] form."""
    height, width = shape
    raster_bounds = array_bounds(height, width, transform)

    west, south, east, north = transform_bounds(
        crs,
        GEOGRAPHIC_CRS,
        *raster_bounds,
        densify_pts=21,
    )

    return [[south, west], [north, east]]


def source_stem(url):
    """Validate a source URL and derive its decoded filename stem."""
    if not isinstance(url, str) or not url.strip():
        raise ValueError("Provide one HDF5 URL as a nonempty string.")

    url_path = urlparse(url).path
    decoded_path = unquote(url_path)

    return Path(decoded_path).stem


def json_value(value):
    """Convert HDF5 scalar/array attributes to strict JSON-compatible values."""
    if isinstance(value, np.ndarray):
        return json_value(value.tolist())

    if isinstance(value, np.generic):
        return json_value(value.item())

    if isinstance(value, bytes):
        return value.decode("utf-8")

    if isinstance(value, (tuple, list)):
        return [json_value(item) for item in value]

    if isinstance(value, complex):
        return {
            "real": json_value(value.real),
            "imag": json_value(value.imag),
        }

    if isinstance(value, float) and not np.isfinite(value):
        return None

    return value


def read_raster_layer(dataset, window, area):
    """Read native pixels and source validity, including zero/negative values."""
    data = dataset[window]
    valid = area & np.isfinite(data)

    if "_FillValue" in dataset.attrs:
        fill_value = np.asarray(dataset.attrs["_FillValue"]).item()
        valid &= data != fill_value

    attributes = {}

    for name, value in dataset.attrs.items():
        # Dimension links refer to HDF5 objects and cannot be saved as JSON.
        if name in {"DIMENSION_LIST", "REFERENCE_LIST"}:
            continue

        attributes[name] = json_value(value)

    return {
        "data": data,
        "valid": valid,
        "source_path": dataset.name,
        "attributes": attributes,
    }


def save_geotiff(
    path,
    data,
    reference,
    *,
    valid=None,
    description=None,
    nodata=None,
    predictor=None,
):
    """Write one native band with optional nodata and an internal validity mask."""
    profile = {
        "driver": "GTiff",
        "height": data.shape[0],
        "width": data.shape[1],
        "count": 1,
        "dtype": data.dtype,
        "crs": reference["crs"],
        "transform": reference["transform"],
        "compress": "deflate",
    }

    if nodata is not None:
        profile["nodata"] = nodata

    if predictor is not None:
        profile["predictor"] = predictor

    with rasterio.Env(GDAL_TIFF_INTERNAL_MASK=True):
        with rasterio.open(path, "w", **profile) as destination:
            if valid is None:
                output_data = data
            else:
                # Keep valid measurements and store zero in excluded pixels.
                output_data = np.where(valid, data, 0)

            destination.write(output_data, 1)

            if valid is not None:
                # GeoTIFF masks use 255 for valid pixels and 0 for invalid ones.
                output_mask = valid.astype(np.uint8) * 255
                destination.write_mask(output_mask)

            if description is not None:
                destination.set_band_description(1, description)


def write_json(path, value):
    """Write readable UTF-8 JSON, rejecting nonstandard NaN/Infinity values."""
    json_text = json.dumps(value, indent=2, allow_nan=False)
    Path(path).write_text(json_text, encoding="utf-8")
