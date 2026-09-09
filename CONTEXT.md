# Domain glossary

Words we use, and what they mean. Do not invent synonyms.

- **Working image** — exactly one local file open. Opening another replaces it.
- **Crop** — optional freeform rectangle in source pixels, drag/resize handles, Reset crop (full image). No aspect locks, no rotate.
- **Crop mode** — the screen for drawing the crop. Open starts here.
- **Compare mode** — the screen for format, quality, flatten color (when needed), estimated size, and Export. Both panes are already cropped.
- **Compare** — left pane is the uncompressed crop; right pane is the encoded preview plus byte size.
- **Optimize** — quality slider 10–100 in steps of 5, always visible. JPEG/WebP = encoder quality, default 80. PNG = lossless compression effort.
- **Convert** — export as JPEG, PNG, or WebP. Default matches the source (BMP/GIF → PNG).
- **Flatten color** — color picker, default white, only when the source has alpha and the output is JPEG. WebP and PNG keep alpha.
- **Open** — Choose File or drag-and-drop. Inputs: JPEG, PNG, WebP, BMP, GIF (first frame). No HEIC.
- **Export** — native Save As, suggested `{stem}-optimized.{ext}`. Cancel is a no-op. Stay on the working image after save. No silent overwrite.
- **Encode** — `sharp` in the Electron main process. Preview size and Save As both go through this module.
