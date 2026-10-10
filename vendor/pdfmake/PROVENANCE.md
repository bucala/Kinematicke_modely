# Offline PDF assets

Unmodified browser distributions from the official npm package `pdfmake@0.2.20`.

- Source: https://www.npmjs.com/package/pdfmake/v/0.2.20
- Upstream: https://github.com/bpampuch/pdfmake
- Library license: MIT, included in `LICENSE`. Upstream third-party notices are retained in the browser distribution.
- Fonts: Roboto Classic, embedded by upstream in `vfs_fonts.js`. The embedded font metadata identifies **Copyright 2011 The Roboto Project Authors** and **SIL Open Font License 1.1**, included in `Roboto-LICENSE.txt`.
- No runtime CDN, package installation or remote PDF conversion.
- The isolated dependency installation passed `npm audit --omit=dev` with no known vulnerabilities. Temporary PDF tooling is not shipped.

SHA-256:

```text
pdfmake.min.js  c2fd3a5e24db096c9139bb7d266765de433b0b866d03ba356c2ef4d9ae1a53b7
vfs_fonts.js    f91db5690400fc851536c3a9322f822619f8e9f681abe42013e572d88d3c1f38
```
