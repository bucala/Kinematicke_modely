# Kinka raster regression

Source: user-provided Kinka.jpg inside Kinka.zip, supplied for Magic import testing on 13 October 2026. Original JPEG: 2752 × 1536 pixels.

The fixture is an RGBA pixel buffer compressed with gzip (768 × 429 × 4 bytes after decompression). It was decoded with Pillow 12.3.0, converted to RGBA, and resized with `Image.resize((768, 429))` (default bicubic sampling), matching the detector side limit. It is an algorithm regression, not a browser canvas decoding test. It requires only Node's built-in zlib at test time.

Original JPEG SHA-256: `ee72a5e1b96ac2142e18573d17e3afb7ed82d9de9ca523c8e573d06e03b94c24`.
RGBA SHA-256: `6005b0b35b831acf9e02fe6e7fa9ed6491354dc44fd2b6f11dff741e21aa8974`.

Expected visible features: common left circular location, central right circular location, lower right circular opening, and the white opening in the separate black part. Detection must preserve these locations and should propose the broad blue silhouette as a plate rather than treating its thickness as a narrow slot. The full silhouettes are split by overlap/background edges. The small lower-left circular mark and physical joint topology remain unresolved; detected circles do not establish fixed supports or functional hinges.
