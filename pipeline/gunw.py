"""Extract NISAR GUNW analysis and visualization layers without resampling.

Unwrapped, wrapped, and offset layers retain their own source grids. Phase
values remain in radians; no atmospheric correction, spatial referencing,
line-of-sight displacement conversion, or landslide classification is applied.
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


PRODUCT = "/science/LSAR/GUNW"
POLARIZATIONS = ("HH", "VV", "HV", "VH", "RH", "RV")

GRID_LAYERS = {
    "unwrappedInterferogram": (
        "unwrappedPhase",
        "coherenceMagnitude",
        "connectedComponents",
        "ionospherePhaseScreen",
        "ionospherePhaseScreenUncertainty",
        "validDataMask",
    ),
    "wrappedInterferogram": (
        "wrappedInterferogram",
        "coherenceMagnitude",
        "validDataMask",
    ),
    "pixelOffsets": (
        "alongTrackOffset",
        "slantRangeOffset",
        "correlationSurfacePeak",
        "validDataMask",
    ),
}

GRID_PREFIXES = {
    "unwrappedInterferogram": "unwrapped",
    "wrappedInterferogram": "wrapped",
    "pixelOffsets": "offsets",
}


def _read_grid(group, grid_name, points, url, selected_polarizations):
    """Read a grid-level mask once and every available selected polarization."""
    polarizations = []

    for polarization in selected_polarizations:
        if polarization in group:
            polarizations.append(polarization)

    if not polarizations:
        raise ValueError(f"No requested polarizations found in {group.name}.")

    # Some files keep coordinates inside the first polarization group.
    coordinates = group
    coordinate_names = ("xCoordinates", "yCoordinates", "projection")

    if not all(name in group for name in coordinate_names):
        coordinates = group[polarizations[0]]

    grid = read_aoi_grid(coordinates, points, url)
    layers = {}
    missing_layers = []

    def read_layer(dataset):
        """Check that a layer fits this grid before reading its AOI window."""
        if not isinstance(dataset, h5py.Dataset) or dataset.shape != grid["shape"]:
            raise ValueError(f"{dataset.name} does not match its GUNW grid.")

        return read_raster_layer(dataset, grid["window"], grid["area"])

    if "mask" in group:
        layers["mask"] = read_layer(group["mask"])
    else:
        missing_layers.append("mask")

    for polarization in polarizations:
        polarization_group = group[polarization]

        for name in GRID_LAYERS[grid_name]:
            key = f"{polarization}/{name}"

            if name in polarization_group:
                layers[key] = read_layer(polarization_group[name])
            else:
                missing_layers.append(key)

        if grid_name == "unwrappedInterferogram":
            for name in ("unwrappedPhase", "coherenceMagnitude"):
                key = f"{polarization}/{name}"

                if key not in layers:
                    raise ValueError(
                        f"Required GUNW layer missing: {polarization_group.name}/{name}"
                    )

    if not layers:
        raise ValueError(f"No supported raster layers found in {group.name}.")

    return {
        "crs": grid["crs"],
        "transform": grid["transform"],
        "area": grid["area"],
        "layers": layers,
        "polarizations": polarizations,
        "missing_layers": missing_layers,
    }


def read_aoi(
    stream,
    url,
    aoi_points,
    frequency="A",
    *,
    polarizations=None,
):
    """Read only AOI windows, using one connection for the interferometric pair."""
    if frequency not in {"A", "B"}:
        raise ValueError("frequency must be 'A' or 'B'.")

    if polarizations is None:
        selected_polarizations = POLARIZATIONS
    else:
        selected_polarizations = tuple(polarizations)

    if not selected_polarizations:
        raise ValueError(
            "Provide polarizations as a nonempty sequence such as ('HH',)."
        )

    for polarization in selected_polarizations:
        if polarization not in POLARIZATIONS:
            raise ValueError(
                "Provide polarizations as a nonempty sequence such as ('HH',)."
            )

    points = validate_aoi(aoi_points)
    base = f"{PRODUCT}/grids/frequency{frequency}"
    grids = {}
    missing_grids = []

    with stream.open(url) as remote:
        with h5py.File(remote, "r") as h5:
            if base not in h5:
                raise ValueError(f"{base} missing in {url}")

            frequency_group = h5[base]

            if "unwrappedInterferogram" not in frequency_group:
                raise ValueError(
                    "Required GUNW unwrappedInterferogram grid is missing."
                )

            for grid_name in GRID_LAYERS:
                if grid_name not in frequency_group:
                    missing_grids.append(grid_name)
                    continue

                group = frequency_group[grid_name]

                if grid_name != "unwrappedInterferogram":
                    has_selected_polarization = any(
                        polarization in group
                        for polarization in selected_polarizations
                    )

                    if not has_selected_polarization:
                        missing_grids.append(grid_name)
                        continue

                grids[grid_name] = _read_grid(
                    group,
                    grid_name,
                    points,
                    url,
                    selected_polarizations,
                )

            primary_grid = grids["unwrappedInterferogram"]
            has_valid_phase = False

            for polarization in primary_grid["polarizations"]:
                phase_key = f"{polarization}/unwrappedPhase"
                phase_layer = primary_grid["layers"][phase_key]

                if phase_layer["valid"].any():
                    has_valid_phase = True
                    break

            if not has_valid_phase:
                raise ValueError("No valid unwrapped phase pixels inside the AOI.")

            # Keep small acquisition details, such as dates and track numbers.
            identification = {}
            identification_path = "/science/LSAR/identification"

            if identification_path in h5:
                for name, dataset in h5[identification_path].items():
                    if not isinstance(dataset, h5py.Dataset):
                        continue

                    if dataset.ndim > 1 or dataset.size > 64:
                        continue

                    identification[name] = json_value(dataset[()])

            # Record 3-D metadata cubes without treating them as 2-D rasters.
            cube_path = f"{PRODUCT}/metadata/radarGrid"
            omitted_cubes = []

            if cube_path in h5:
                for dataset in h5[cube_path].values():
                    if isinstance(dataset, h5py.Dataset) and dataset.ndim == 3:
                        omitted_cubes.append(dataset.name)

    return {
        "source": url,
        "frequency": frequency,
        "aoi": {
            "type": "Polygon",
            "coordinates": [points.tolist()],
        },
        "identification": identification,
        "grids": grids,
        "missing_grids": missing_grids,
        "omitted_metadata_cubes": omitted_cubes,
    }


def _phase_valid_mask(grid, pol, coherence_threshold):
    """Select phase-analysis pixels; native rasters retain all source values."""
    layers = grid["layers"]
    phase = layers[f"{pol}/unwrappedPhase"]
    coherence = layers[f"{pol}/coherenceMagnitude"]

    valid = phase["valid"] & coherence["valid"]
    coherence_in_range = (
        (coherence["data"] >= coherence_threshold)
        & (coherence["data"] <= 1)
    )
    valid &= coherence_in_range

    criteria = [
        "Inside AOI with finite, non-fill unwrapped phase and coherence",
        f"{coherence_threshold} <= coherenceMagnitude <= 1",
    ]

    if "mask" in layers:
        layer = layers["mask"]

        if layer["data"].dtype.kind not in "ui":
            raise ValueError("The GUNW mask must contain integer quality codes.")

        # The lowest byte stores the land/water and subswath codes.
        packed_mask = layer["data"].astype(np.uint64)
        subswath_codes = packed_mask & 255
        is_land = subswath_codes < 100
        has_reference_subswath = (subswath_codes % 100) // 10 > 0
        has_secondary_subswath = subswath_codes % 10 > 0

        # The next 16 bits contain the reference/secondary anomaly flags.
        anomaly_flags = (packed_mask >> 8) & 65535
        has_no_anomalies = anomaly_flags == 0

        valid &= layer["valid"]
        valid &= is_land & has_reference_subswath & has_secondary_subswath
        valid &= has_no_anomalies

        criteria.append(
            "Land, valid reference/secondary subswaths, and no RSLC anomaly flags"
        )

    component_key = f"{pol}/connectedComponents"

    if component_key in layers:
        layer = layers[component_key]
        has_component_label = (layer["data"] > 0) & (layer["data"] != 65535)
        valid &= layer["valid"] & has_component_label
        criteria.append("connectedComponents is neither 0 (unlabeled) nor 65535 (fill)")

    focused_key = f"{pol}/validDataMask"

    if focused_key in layers:
        layer = layers[focused_key]
        valid &= layer["valid"] & (layer["data"] == 3)
        criteria.append("validDataMask == 3 (reference and secondary fully focused)")

    return valid.astype(np.uint8), criteria


def _visualization(name, layer):
    """Describe rendering ranges without changing scientific pixel values."""
    if name in {"coherenceMagnitude", "correlationSurfacePeak"}:
        return {
            "colormap": "viridis",
            "min": 0,
            "max": 1,
        }

    if name in {"mask", "validDataMask", "connectedComponents"}:
        return {
            "rendering": "categorical",
            "interpolation": "nearest",
        }

    if np.iscomplexobj(layer["data"]):
        return {
            "rendering": "complex",
            "phase_units": "radians",
        }

    values = layer["data"][layer["valid"]]

    if not values.size:
        return {"rendering": "no valid pixels"}

    low, high = np.percentile(values, [2, 98])

    if name in {
        "unwrappedPhase",
        "ionospherePhaseScreen",
        "alongTrackOffset",
        "slantRangeOffset",
    }:
        # Center signed values on zero, even when all valid values are zero.
        limit = max(abs(float(low)), abs(float(high)))

        if limit == 0:
            limit = 1.0

        return {
            "colormap": "RdBu_r",
            "min": -limit,
            "max": limit,
        }

    return {
        "colormap": "viridis",
        "min": float(low),
        "max": float(high),
    }


def convert_hdf5(
    stream,
    url,
    aoi_points,
    output_dir,
    frequency="A",
    *,
    polarizations=None,
    coherence_threshold=0.3,
):
    """Export flat GeoTIFFs, one bounds file, and one merged metadata file.

    Pass data/{location}/gunw as output_dir. Files are saved under {stem}/.
    All available native grids are preserved. bounds.json maps grid names to
    geographic bounds; metadata.json records each layer's grid and rendering.
    The configurable coherence threshold only affects derived phase masks.
    """
    stem = source_stem(url)

    if not np.isfinite(coherence_threshold) or not 0 <= coherence_threshold <= 1:
        raise ValueError("coherence_threshold must be between 0 and 1.")

    coherence_threshold = float(coherence_threshold)

    reference = read_aoi(
        stream,
        url,
        aoi_points,
        frequency,
        polarizations=polarizations,
    )

    directory = Path(output_dir) / stem
    directory.mkdir(parents=True, exist_ok=True)

    if frequency == "A":
        prefix = ""
    else:
        prefix = "frequencyB_"

    paths = {
        "directory": directory,
        "bounds": directory / f"{prefix}bounds.json",
        "metadata": directory / "metadata.json",
        "layers": {},
    }

    bounds = {}
    grid_metadata = {}

    for grid_name, grid in reference["grids"].items():
        grid_prefix = GRID_PREFIXES[grid_name]
        layer_metadata = {}

        # Export the original raster values before writing derived layers.
        for key, layer in grid["layers"].items():
            filename = key.replace("/", "_")

            if grid_name != "unwrappedInterferogram" or key == "mask":
                filename = f"{grid_prefix}_{filename}"

            path = directory / f"{prefix}{filename}.tif"

            save_geotiff(
                path,
                layer["data"],
                grid,
                valid=layer["valid"],
                description=key,
            )

            paths["layers"][f"{grid_name}/{key}"] = path
            layer_name = key.split("/")[-1]

            layer_metadata[key] = {
                "file": path.name,
                "source_path": layer["source_path"],
                "dtype": str(layer["data"].dtype),
                "attributes": layer["attributes"],
                "valid_pixel_count": int(layer["valid"].sum()),
                "visualization": _visualization(layer_name, layer),
            }

        # Phase masks and wrapped phase are separate from the source layers.
        for polarization in grid["polarizations"]:
            if grid_name == "unwrappedInterferogram":
                data, criteria = _phase_valid_mask(
                    grid,
                    polarization,
                    coherence_threshold,
                )

                key = f"{polarization}/phase_valid_mask"
                path = directory / f"{prefix}{polarization}_phase_valid_mask.tif"
                valid = grid["area"]

                details = {
                    "criteria": criteria,
                    "valid_pixel_count": int(data.sum()),
                }

            elif grid_name == "wrappedInterferogram":
                source_key = f"{polarization}/wrappedInterferogram"

                if source_key not in grid["layers"]:
                    continue

                source = grid["layers"][source_key]
                data = np.angle(source["data"]).astype(np.float32)
                valid = source["valid"] & (np.abs(source["data"]) > 0)

                key = f"{polarization}/wrappedPhase"
                path = directory / f"{prefix}wrapped_{polarization}_wrappedPhase.tif"

                details = {
                    "units": "radians",
                    "formula": "angle(wrappedInterferogram)",
                    "visualization": {
                        "colormap": "twilight",
                        "min": -float(np.pi),
                        "max": float(np.pi),
                    },
                }

            else:
                continue

            save_geotiff(path, data, grid, valid=valid, description=key)

            paths["layers"][f"{grid_name}/{key}"] = path
            layer_metadata[key] = {
                "file": path.name,
                "derived": True,
            }
            layer_metadata[key].update(details)

        bounds[grid_name] = geographic_bounds(
            grid["area"].shape,
            grid["transform"],
            grid["crs"],
        )

        grid_metadata[grid_name] = {
            "source_crs": grid["crs"],
            "shape": list(grid["area"].shape),
            "transform": list(grid["transform"])[:6],
            "bounds_key": grid_name,
            "polarizations": grid["polarizations"],
            "layers": layer_metadata,
            "missing_layers": grid["missing_layers"],
        }

    # Preserve metadata for other frequencies already exported to this folder.
    metadata = {}

    if paths["metadata"].exists():
        metadata = json.loads(paths["metadata"].read_text(encoding="utf-8"))

    metadata.update(
        {
            "source": url,
            "product": "GUNW",
            "aoi": reference["aoi"],
            "identification": reference["identification"],
            "processing": (
                "AOI clipping only; source grids, native values, and dtypes preserved"
            ),
            "validity": (
                "Read GeoTIFF internal masks with masked=True; "
                "invalid stored values are zero"
            ),
            "limitations": [
                (
                    "Unwrapped phase has not been atmospherically corrected "
                    "or spatially referenced."
                ),
                (
                    "No displacement or landslide classification is computed; "
                    "component labels have independent phase offsets."
                ),
                (
                    "Low coherence can be a change signal; native layers are "
                    "not filtered by the phase-validity threshold."
                ),
                (
                    "3-D metadata cubes require terrain-height interpolation "
                    "and are not exported as 2-D rasters."
                ),
            ],
        }
    )

    frequencies = metadata.setdefault("frequencies", {})
    frequencies[frequency] = {
        "primary_grid": "unwrappedInterferogram",
        "bounds_file": paths["bounds"].name,
        "coherence_threshold": coherence_threshold,
        "grids": grid_metadata,
        "missing_grids": reference["missing_grids"],
        "omitted_metadata_cubes": reference["omitted_metadata_cubes"],
    }

    write_json(paths["bounds"], bounds)
    write_json(paths["metadata"], metadata)

    return paths
