# ADR 0002: Crop mode and Compare mode

## Status

Accepted

## Context

Compare is both panes already cropped (left uncompressed, right encoded). The crop rectangle therefore cannot live on the left Compare pane. Putting a full-image source stage on the same screen as Compare stacks two jobs.

## Decision

Two modes, one job on screen:

- **Crop mode** — full working image, crop rectangle with handles, Reset crop. No format/quality/export.
- **Compare mode** — cropped uncompressed | cropped encoded + size; format; quality; flatten color when required; Export.

Open starts in Crop mode. Encode settings persist when toggling. Crop coordinates are source pixels and are the input to `encode`.

## Consequences

- Format, quality, flatten, size, and Export do not appear in Crop mode.
- The left Compare pane may be a canvas crop of the decoded bitmap; the right pane and Export go through `encode`.
