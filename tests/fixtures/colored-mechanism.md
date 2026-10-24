# Colored mechanism raster regression

Source: user-supplied `Gemini_Generated_Image_b4samub4samub4sa.jpg`, supplied for Magic import testing on 21 October 2026. Original size: 2048 × 1529 pixels.

The fixture is a gzip-compressed RGBA buffer (768 × 573 × 4 bytes). Pillow converted the JPEG to RGBA and resized it with `Image.thumbnail((768, 768), Image.Resampling.BILINEAR)`. This exercises the offline pixel algorithm; it does not assert browser-specific JPEG decoding or resampling. Tests use only Node built-ins.

Original JPEG SHA-256: `68a5c2929e4b7bc0f458d8695643825bd3095c26fd22a49bd360196ba914bd87`.
RGBA SHA-256: `5ea70ae56272c4d0dedfd1753bd9d6defa033acfd08c085f1c4d35bc794c6a57`.

Expected evidence: circular features near (259, 483), (620, 403), (649, 434); a long blue member; a red plate; a hollow green frame; a broad black base with a protruding upright; and the visible horizontal white cavity inside an orange border. Preserve the base silhouette instead of inventing a curved guide through it. Suppress duplicate nested fill/edge fragments while preserving the separate plates, possible paths and circular features.

Overlapping yellow/orange guide outlines are partially hidden. Their complete paths, endpoints, ownership, fixed/moving roles and physical joint types cannot be established from this one image. Candidates remain proposals for review. Candidate count alone is not an accuracy metric.
