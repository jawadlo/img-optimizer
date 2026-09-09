# ADR 0001: Encode with sharp in the main process

## Status

Accepted

## Context

Encode (crop, format, quality, JPEG flatten) can live in the renderer (`canvas` / `toBlob`) or in the Electron main process (`sharp`). Canvas is simpler on Windows Electron: no native addons, no rebuilds. Sharp produces better JPEG/WebP and needs a native `.node` binary, `electron-rebuild` when Electron’s ABI changes, and `asarUnpack` so the binary is not trapped in the asar archive.

## Decision

Encode in the **main** process with **sharp**. Compare preview and Export call the same `encode` module. The renderer does not re-encode.

Vite must **externalize** `sharp` (do not bundle the `.node` file). electron-builder must unpack:

- `**/node_modules/sharp/**`
- `**/node_modules/@img/**`

Install and run on Windows so the win32-x64 binary is the one that loads.

## Consequences

- Better output quality than Chrome’s encoder.
- Native-module setup cost on Windows; preview and size estimates are IPC round-trips.
- Do not switch to canvas/`toBlob` without superseding this ADR.
