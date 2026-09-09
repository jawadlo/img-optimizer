# ADR 0003: Out of scope for v1

## Status

Accepted

## Context

The product is a private, one-image, edit-then-export desktop tool. Several nearby features would turn it into a batch compressor or a mini editor.

## Decision

Do not build:

- Batch / folder queues
- Resize / max long-edge
- HEIC, AVIF
- Rotate / flip
- EXIF / GPS strip
- Aspect-ratio crop presets
- Filters, text, annotations
- An Overwrite original button (Save As to the original path is an explicit user choice)
- Last-used format memory (default matches the source file)

## Consequences

Architecture reviews and new tickets must not re-suggest these without superseding this ADR. A reason like “not now” is not enough to drop this list; a change in the job-to-be-done is.
