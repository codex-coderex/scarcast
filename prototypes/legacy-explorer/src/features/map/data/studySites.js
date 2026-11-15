// Optional case study shortcuts. These are NOT verified landslide events.
// Replace these records with documented locations and citations before public demonstrations.
export const studySites = [
  {
    id: "site-a",
    name: "Study site A",
    location: "Northern Luzon, Philippines — demonstration location",
    center: [16.4, 120.6],
    radiusMeters: 5000,
    eventDate: null,
    verified: false,
  },
  {
    id: "site-b",
    name: "Study site B",
    location: "Southern Mindanao, Philippines — demonstration location",
    center: [6.9, 125.1],
    radiusMeters: 5000,
    eventDate: null,
    verified: false,
  },
];

// Real scenes only. Populate from a validated acquisition manifest.
// Example SHAPE (do not add as real data):
// { id, product: "GCOV", acquisitionDate: "YYYY-MM-DD", siteId?: "site-a",
//   bounds?: [[south, west], [north, east]], layerUrl?, attribution?, qualityUrl? }
// Arbitrary AOIs require geographic coverage metadata (`bounds`) to match scenes.
export const observations = [];
