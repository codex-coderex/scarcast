# Offline processing

The browser consumes existing exports. It should not download and extract full satellite products when someone opens a dashboard.

## Current entry points

Run from the repository root with a Python environment containing `process/requirements.txt`.

| Task | Entry point / inputs |
| --- | --- |
| Inspect matching radar products | `python process/extract_region.py --config regions/balikabok_downstream.json` |
| Extract those products | Add `--extract`; optionally `--product GCOV` or `--product GUNW` |
| Original mountain extraction | `process/main.py`; existing hardcoded study configuration |
| Build radar change rasters and display overlays | `python process/build_backscatter_change.py` after GCOV extraction |
| Inventory independent evidence | `python process/fetch_corroboration.py --inventory` |
| Export terrain / optical vegetation evidence | `python process/fetch_corroboration.py --extract` |
| Export dated optical RGB frames | `python process/build_optical_timeline.py --inventory --extract` |
| Join radar candidates with vegetation evidence | `python process/build_investigation.py` after radar change and corroboration exports |
| Build selectable assessment objects and three optical-support states | `npm run process:assessment` after the preceding exports; uses existing rasters and cached HLS bands, makes no network requests |
| Optional historical 3D corridor | `node process/build_debris_corridor.mjs path/to/n14e120.hgt` after investigation exports |

Network entry points require existing Earthdata authentication. `--inventory` may still query remote catalogs. The optical builder uses its cached catalog when run with `--extract` alone and that catalog exists. Remote input downloads are cached under the OS temporary directory in `scarcast-corroboration-inputs`.

`extract_region.py` skips complete compatible exports and stages new products before publishing them into the discovered data folders. Preserve these checks in a replacement pipeline. See [CORROBORATION.md](CORROBORATION.md) for exact methods, dates, masks, sources, and evidence limits.

The files stay in this directory for now because Python imports and artifact paths depend on their current locations. A future pipeline can wrap them without a disruptive folder-only rewrite. See [the processing roadmap](../docs/PROCESSING_ROADMAP.md).

The assessment builder publishes `assessment.json`, `candidates-*.geojson`, and `support-*.geojson`. It groups native radar pixels before optical splitting, traces their boundaries, records exact raster-count areas, and checks radar/optical totals against `investigation.json` before publication. Candidate IDs are interval-specific native seed indices, not cross-date tracking IDs. Its optical cache defaults to the existing OS temporary cache; set `SCARCAST_INPUT_CACHE` to use another persistent cache. Original GCOV/GUNW and evidence exports are left intact.
