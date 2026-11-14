# Supplied NISAR samples

The three `_db.tif` files and matching JSON sidecars were copied byte-for-byte from the supplied `Downloads/output` directory. Each metadata sidecar records its original NASA/ASF provisional NISAR L2 GCOV HDF5 URL, AOI, and `/science/LSAR/GCOV/grids/frequencyA/HHHH` layer. The files store dB backscatter values.

The product filenames give UTC start times of August 22, 2026 at 21:30:32, September 3 at 21:30:32, and September 15 at 21:30:31. The TIFF ImageDescription is empty, and DateTime/GDAL_METADATA tags are absent. Time labels retain their filename-derived provenance.

All three TIFFs have one Float32 band, 1,074 columns and 831 rows, native EPSG 32651 (WGS84 / UTM zone 51N), PixelIsArea semantics, and 10-metre grid spacing. Their upper-left origin is easting 214780, northing 1655350. Resolution is `[10, -10]`. GDAL NoData is NaN. Encoding is striped Adobe Deflate with floating-point predictor 3.

Native extent in UTM metres is `[214780, 1647040, 225520, 1655350]` as xmin/ymin/xmax/ymax. The approximate JSON display bounds differ from the transformed native envelope by roughly 1–2 metres at the south/east limits. Overlay placement and inspection use native TIFF georeferencing.

| Date | Finite pixels | NaN pixels | Exact valid zeros |
| --- | --- | --- | --- |
| 2026-08-22 | 649733 | 242761 | 1 |
| 2026-09-03 | 649734 | 242760 | 0 |
| 2026-09-15 | 649736 | 242758 | 0 |

Their shared finite intersection contains 649723 pixels. This is source QA for all three scenes. Selected-pair overlap depends on that pair's own masks. NoData records missing/masked values, while terrain visibility assessment requires independent geometry/terrain data.

The common display stretch `[-13.080083084106445, 1.167296767234798]` is the union of the sidecars' display limits. It clips the color display at both extremes. Pixel inspection retains the stored values.

## Pixel-center anchors

Rows/columns are zero-based. Coordinates are latitude/longitude. Stored dB readings were independently decoded in Python and are checked by the JavaScript tests to `1e-5` dB.

| Row, column | Latitude, longitude | Aug 22 | Sep 3 | Sep 15 |
| --- | --- | --- | --- | --- |
| 207, 268 | 14.939231143517288, 120.37349389618463 | -5.850677013397217 | -4.244648456573486 | -5.615272521972656 |
| 415, 537 | 14.920730721400854, 120.39870836896272 | -7.960824012756348 | -7.702043056488037 | -6.000236988067627 |
| 623, 805 | 14.902225749295823, 120.42382584507249 | -9.290138244628906 | -8.92297649383545 | -7.2934651374816895 |
| 0, 0 | 14.95763881440507, 120.34836931226607 | NaN | NaN | NaN |

The corner anchor is inside the raster grid and gives `nodata`. The tests also inspect points beyond every native grid edge and locate the real valid zero in the August 22 source.
