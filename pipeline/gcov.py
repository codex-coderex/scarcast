"""Read a GCOV AOI once and export native data, dB backscatter, or both.

Native layers retain their source grid, values, dtypes, and validity masks.
The HHHH backscatter export contains positive intensities converted to dB.
Temporal change analysis and landslide classification are separate steps.
"""

import json
from pathlib import Path

import h5py
import numpy as np

from helpers import (
    geographic_bounds,
    json_value,
    read_aoi_grid,
    read_raster_layer,
    save_geotiff,
    source_stem,
    validate_aoi,
    write_json,
)


PRODUCT = "/science/LSAR/GCOV"
BACKSCATTER_TERM = "HHHH"

COVARIANCE_TERMS = (
    # Real intensity terms.
    "HHHH",
    "HVHV",
    "VVVV",
    "VHVH",
    "RHRH",
    "RVRV",
    # Complex terms relating different polarizations.
    "HHHV",
    "HHVH",
    "HHVV",
    "HVVH",
    "HVVV",
    "VHVV",
    "RHRV",
)

QUALITY_LAYERS = (
    "mask",
    "numberOfLooks",
    "rtcGammaToSigmaFactor",
    "inputDataExceptionMask",
)

IDENTIFICATION_FIELDS = (
    "zeroDopplerStartTime",
    "zeroDopplerEndTime",
    "orbitPassDirection",
    "trackNumber",
    "frameNumber",
    "absoluteOrbitNumber",
    "lookDirection",
    "productVersion",
    "radarBand",
)


def read_aoi(
    stream,
    url,
    aoi_points,
    frequency="A",
    *,
    terms=None,
    include_quality=True,
):
    """Read covariance and optional quality layers using one source connection.

    By default, read every available covariance term. Pass terms to request
    specific covariance channels and fail clearly if any are unavailable.
    """
    if frequency not in {"A", "B"}:
        raise ValueError("frequency must be 'A' or 'B'.")

    points = validate_aoi(aoi_points)
    base = f"{PRODUCT}/grids/frequency{frequency}"

    with stream.open(url) as remote:
        with h5py.File(remote, "r") as h5:
            if base not in h5:
                raise ValueError(f"{base} missing in {url}")

            group = h5[base]

            # Use all available covariance terms unless specific ones are given.
            if terms is None:
                terms = []

                for name in COVARIANCE_TERMS:
                    if name in group:
                        terms.append(name)
            else:
                terms = list(terms)

                for name in terms:
                    if name not in COVARIANCE_TERMS:
                        raise ValueError(f"Unknown covariance term: {name}")

                    if name not in group:
                        raise ValueError(f"{base}/{name} missing in {url}")

            if not terms:
                raise ValueError(f"No covariance terms found in {base}.")

            grid = read_aoi_grid(group, points, url)

            quality_names = []

            for name in QUALITY_LAYERS:
                if name in group:
                    quality_names.append(name)

            layer_names = list(terms)

            if include_quality:
                layer_names.extend(quality_names)

            # Read only the raster window that covers the area of interest.
            layers = {}

            for name in layer_names:
                dataset = group[name]

                if (
                    not isinstance(dataset, h5py.Dataset)
                    or dataset.shape != grid["shape"]
                ):
                    raise ValueError(f"{base}/{name} does not match the GCOV grid.")

                layers[name] = read_raster_layer(
                    dataset,
                    grid["window"],
                    grid["area"],
                )

            has_valid_pixels = False

            for name in terms:
                if layers[name]["valid"].any():
                    has_valid_pixels = True
                    break

            if not has_valid_pixels:
                raise ValueError("No valid covariance pixels inside the AOI.")

            identification = {}

            for name in IDENTIFICATION_FIELDS:
                dataset_path = f"/science/LSAR/identification/{name}"

                if dataset_path in h5:
                    identification[name] = json_value(h5[dataset_path][()])

    missing_quality_layers = []

    for name in QUALITY_LAYERS:
        if name not in quality_names:
            missing_quality_layers.append(name)

    return {
        "source": url,
        "layers": layers,
        "terms": terms,
        "crs": grid["crs"],
        "transform": grid["transform"],
        "area": grid["area"],
        "aoi": grid["aoi"],
        "identification": identification,
        "frequency": frequency,
        "missing_quality_layers": missing_quality_layers,
    }


def _analysis_valid_mask(reference):
    """Combine available quality flags without changing the native layers."""
    layers = reference["layers"]
    valid = reference["area"].copy()
    criteria = ["Inside AOI and valid in every exported covariance term"]

    for name in reference["terms"]:
        valid &= layers[name]["valid"]

    if "mask" in layers:
        layer = layers["mask"]
        is_focused = (layer["data"] > 0) & (layer["data"] < 255)
        valid &= layer["valid"] & is_focused
        criteria.append("mask is between 1 and 254 (fully focused subswath)")

    if "numberOfLooks" in layers:
        layer = layers["numberOfLooks"]
        valid &= layer["valid"] & (layer["data"] > 0)
        criteria.append("numberOfLooks > 0")

    if "inputDataExceptionMask" in layers:
        layer = layers["inputDataExceptionMask"]
        valid &= layer["valid"] & (layer["data"] == 0)
        criteria.append("inputDataExceptionMask == 0 (no reported exception)")

    return valid.astype(np.uint8), criteria


def export_native_data(reference, output_dir):
    """Write native layers and return paths plus metadata for the shared file.

    GeoTIFFs carry internal validity masks; read them with masked=True.
    No dB conversion, visualization scaling, or resampling is applied.
    """
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)

    if reference["frequency"] == "A":
        prefix = ""
    else:
        prefix = "frequencyB_"

    paths = {
        "directory": directory,
        "layers": {},
        "analysis_valid_mask": directory / f"{prefix}analysis_valid_mask.tif",
    }

    layer_metadata = {}

    for name, layer in reference["layers"].items():
        path = directory / f"{prefix}{name}.tif"

        save_geotiff(
            path,
            layer["data"],
            reference,
            valid=layer["valid"],
            description=name,
        )

        paths["layers"][name] = path

        if name in COVARIANCE_TERMS:
            layer_kind = "covariance"
        else:
            layer_kind = "quality"

        layer_metadata[name] = {
            "file": path.name,
            "source_path": layer["source_path"],
            "dtype": str(layer["data"].dtype),
            "kind": layer_kind,
            "valid_pixel_count": int(layer["valid"].sum()),
            "attributes": layer["attributes"],
        }

    # Save the combined quality checks separately from the original layers.
    valid_mask, criteria = _analysis_valid_mask(reference)

    save_geotiff(
        paths["analysis_valid_mask"],
        valid_mask,
        reference,
        valid=reference["area"],
        description=(
            "Analysis validity: 1 = valid under available criteria, 0 = excluded"
        ),
    )

    metadata = {
        "layers": layer_metadata,
        "missing_quality_layers": reference["missing_quality_layers"],
        "analysis_valid_mask": {
            "file": paths["analysis_valid_mask"].name,
            "criteria": criteria,
            "valid_pixel_count": int(valid_mask.sum()),
        },
        "processing": "AOI clipping only; native values, grid, and dtypes preserved",
        "validity": "Read GeoTIFF internal masks; invalid stored values are zero",
        "limitations": [
            (
                "Available quality checks only; GCOV mask is not a landslide "
                "or layover/shadow mask."
            ),
            (
                "No temporal change, interferometric coherence, "
                "or displacement is computed."
            ),
            (
                "Landslide mapping requires comparison acquisitions, "
                "terrain data, and validation."
            ),
        ],
    }

    return paths, metadata


def to_db(values):
    """Convert positive real intensities to dB, leaving other values as NaN."""
    if np.iscomplexobj(values):
        raise ValueError("Backscatter dB conversion requires real intensity values.")

    result = np.full(values.shape, np.nan, dtype=np.float32)
    valid = np.isfinite(values) & (values > 0)

    # The logarithm is defined only for positive intensity values.
    result[valid] = 10 * np.log10(values[valid])

    return result


def export_backscatter(reference, output_dir):
    """Write HHHH dB and return paths plus metadata for the shared file."""
    if BACKSCATTER_TERM not in reference["layers"]:
        raise ValueError(
            "HHHH is unavailable; use export_db=False for native data only."
        )

    layer = reference["layers"][BACKSCATTER_TERM]
    backscatter_db = to_db(layer["data"])
    backscatter_db[~layer["valid"]] = np.nan
    valid = np.isfinite(backscatter_db)

    if not valid.any():
        raise ValueError("No valid positive backscatter pixels inside the AOI.")

    # Percentiles describe a useful display range without changing the data.
    low, high = np.percentile(backscatter_db[valid], [2, 98])

    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)

    if reference["frequency"] == "A":
        prefix = ""
    else:
        prefix = "frequencyB_"

    paths = {
        "geotiff": directory / f"{prefix}db.tif",
    }

    save_geotiff(
        paths["geotiff"],
        backscatter_db,
        reference,
        nodata=np.nan,
        predictor=3,
    )

    metadata = {
        "file": paths["geotiff"].name,
        "layer": layer["source_path"],
        "units": "dB",
        "visualization": "Single-acquisition backscatter (dB)",
        "display_min_db": float(low),
        "display_max_db": float(high),
    }

    return paths, metadata


def convert_hdf5(
    stream,
    url,
    aoi_points,
    output_dir,
    frequency="A",
    *,
    export_native=True,
    export_db=True,
):
    """Read one acquisition and export the requested outputs.

    Supply the location-specific output_dir, for example
    data/mount_balikabok/gcov. All files are written directly under {stem}/:
        db.tif, HHHH.tif, HVHV.tif, other available layers,
        analysis_valid_mask.tif, bounds.json, metadata.json.

    One metadata file holds acquisition details and per-frequency native and
    backscatter descriptions. Frequency B filenames use a frequencyB_ prefix
    and bounds_frequencyB.json to keep its separate grid from overwriting A.
    Disable either export with export_native=False or export_db=False.
    """
    if not export_native and not export_db:
        raise ValueError("Select at least one output: export_native or export_db.")

    stem = source_stem(url)

    if export_native:
        terms = None  # Read every available covariance term.
    else:
        terms = (BACKSCATTER_TERM,)

    reference = read_aoi(
        stream,
        url,
        aoi_points,
        frequency,
        terms=terms,
        include_quality=export_native,
    )

    directory = Path(output_dir) / stem

    if frequency == "A":
        bounds_name = "bounds.json"
    else:
        bounds_name = "bounds_frequencyB.json"

    bounds_path = directory / bounds_name
    metadata_path = directory / "metadata.json"
    paths = {
        "directory": directory,
        "bounds": bounds_path,
        "metadata": metadata_path,
    }

    # Keep metadata from other frequencies when updating this acquisition.
    metadata = {}

    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

    metadata.update(
        {
            "source": reference["source"],
            "product": "GCOV",
            "aoi": reference["aoi"],
            "identification": reference["identification"],
        }
    )

    frequencies = metadata.setdefault("frequencies", {})
    frequency_metadata = frequencies.setdefault(frequency, {})
    frequency_metadata.update(
        {
            "source_crs": reference["crs"],
            "shape": list(reference["area"].shape),
            "transform": list(reference["transform"])[:6],
            "bounds_file": bounds_name,
        }
    )

    # Validate and export dB first so unavailable HHHH data fail before any
    # native files are written. The source data remain unchanged for that export.
    if export_db:
        backscatter_paths, backscatter_metadata = export_backscatter(
            reference, directory
        )
        paths["backscatter"] = backscatter_paths
        frequency_metadata["backscatter"] = backscatter_metadata
        paths["backscatter"]["bounds"] = bounds_path
        paths["backscatter"]["metadata"] = metadata_path

    if export_native:
        paths["native"], native_metadata = export_native_data(reference, directory)
        frequency_metadata.update(native_metadata)
        paths["native"]["bounds"] = bounds_path
        paths["native"]["metadata"] = metadata_path

    bounds = geographic_bounds(
        reference["area"].shape,
        reference["transform"],
        reference["crs"],
    )

    write_json(bounds_path, bounds)
    write_json(metadata_path, metadata)

    return paths
