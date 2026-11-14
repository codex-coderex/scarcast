from gcov import convert_hdf5 as extract_gcov
from gunw import convert_hdf5 as extract_gunw
from helpers import DATA_DIR
from stream import NISARStream


def extract_mount_balikabok():
    LOCATION_NAME = "mount_balikabok"
    AOI_POINTS = (
        (120.365, 14.9431),
        (120.3495, 14.9208),
        (120.3589, 14.8974),
        (120.3944, 14.884),
        (120.4257, 14.8895),
        (120.4478, 14.9043),
        (120.4461, 14.9292),
        (120.4384, 14.9499),
        (120.4168, 14.9551),
        (120.39, 14.9574),
        (120.365, 14.9431),
    )
    AOI = "POLYGON((" + ",".join(f"{lon} {lat}" for lon, lat in AOI_POINTS) + "))"
    START_DATE = "2026-08-21"
    END_DATE = "2026-09-16"
    FILE_COUNT = 3
    FLIGHT_DIRECTION = "Ascending"
    EXPORT_NATIVE = True
    EXPORT_DB = True
    EXTRACT_GCOV = True
    EXTRACT_GUNW = True
    GUNW_COHERENCE_THRESHOLD = 0.3

    products = (
        ("GCOV", EXTRACT_GCOV, extract_gcov, {
            "export_native": EXPORT_NATIVE,
            "export_db": EXPORT_DB,
        }),
        ("GUNW", EXTRACT_GUNW, extract_gunw, {
            "coherence_threshold": GUNW_COHERENCE_THRESHOLD,
        }),
    )
    for product, enabled, extract, options in products:
        if not enabled:
            continue
        stream = (
            NISARStream()
            .setAOI(AOI)
            .setProcessingLevel(product)
            .setDateRange(START_DATE, END_DATE)
            .setMaxResults(FILE_COUNT)
            .setFlightDirection(FLIGHT_DIRECTION)
        )
        output_dir = DATA_DIR / LOCATION_NAME / product.lower()
        urls = stream.search()[:FILE_COUNT]
        print(f"Found {len(urls)} {product} files.")

        for index, url in enumerate(urls, start=1):
            print(f"Processing {product} {index}/{len(urls)}: {url}")
            paths = extract(stream, url, AOI_POINTS, output_dir=output_dir, **options)
            print(f"Saved to {paths['directory']}")


if __name__ == "__main__":
    extract_mount_balikabok()
