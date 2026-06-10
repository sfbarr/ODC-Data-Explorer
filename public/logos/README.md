# Header partner logos

The header renders two partner logos flanking the spinning ODC badge.
Drop the image files here with these exact names:

- `u2fp.png` — shown on the **left** of the ODC badge
- `ucsf.png` — shown on the **right** of the ODC badge

Notes:
- PNG with a transparent background works best on the dark header.
- Any aspect ratio is fine; CSS caps height (~34–48px) and max width, preserving ratio.
- Until these files exist the slots auto-hide (no broken-image icons).
- If your files use different names/formats (e.g. `.svg`), either rename them
  to the above or update the `src` paths in `src/App.tsx` (`partnerLogo` imgs).
