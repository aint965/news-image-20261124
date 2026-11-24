# Fix report — news-image-20261124 (3 weaknesses)

Baseline render (before fix): sha256
`8b87bebec833f1e4afd518195cb64225b6ef9a755fba8115845ab92d488a3b89`
(19,971 bytes). Fixed render: sha256
`7aca2fcb3aaa827115bc890f509f27f78dc90db0e6850c77fbdbe39fb92869e0`
(20,098 bytes).

## What changed (main.ts only)

1. **Globe (COP31 story) — bigger and clearer**
   - Picture box grew: row-1 pic height 64 -> 80 px, so the disc radius
     went 27 -> 36 px (diameter 54 -> 72 px, +33%).
   - Redrew the pictogram: an orbit ring ellipse behind the disc (uses the
     wide box), curved meridians as full ellipses (0.35r / 0.7r) plus the
     centre line, parallels as arcs bulging toward the equator, and the
     landmasses as irregular green polygons instead of circles. No circles
     + straight lines remain, so it no longer reads as a molecule diagram.
2. **Deck text — bigger**
   - All decks (lead + 5 grid stories) went from bitmap scale 2 (10x14 px
     per glyph) to scale 3 (15x21 px per glyph), line height 17 -> 22 px
     (lead deck 18 -> 24 px). At a 300 px thumbnail that is ~6 px cap
     height instead of ~4 px.
   - Decks were shortened so the larger type still fits the cells (wording
     of all six headlines untouched): lead deck, COP31, Iran, Nvidia,
     Democrats, Sport. Layout rebalanced to make room: lead height
     256 -> 236, row 1 moved up to y=444 with height 276, row 2 y=732
     height 252.
3. **Football (Women's World Cup story) — reads as a ball**
   - Outer patches are now real pentagons (fillPentagon) instead of filled
     circles, and much larger: radius 0.17r -> 0.22r, centres moved in to
     0.66r; centre pentagon 0.32r -> 0.28r; seams thickened 2 -> 3 px and
     run pentagon-vertex to pentagon-vertex.
   - Added a grass strip along the bottom of the picture box plus a dark
     shadow ellipse under the ball, so the ball sits on the ground.
   - New helpers: `ellipse` / `ellipseArc` / `fillEllipse` /
     `fillPentagon`; new colour `DARKGREEN` for the shadow.

## Unchanged (as required)

- 1024x1024, masthead "THE WORLD TODAY", date line
  "TUESDAY, 24 NOVEMBER 2026", and the wording of all six headlines.
- No network, no assets; Node 22 standard library only.

## Verification (in-session)

- Rendered twice with `MAKEFUN_OUTPUT_DIR=checks/r1|checks/r2 node main.ts`:
  both exit 0, **byte-identical** (sha256 7aca2fcb... both runs).
- Only stderr output is the pre-existing Node
  `[MODULE_TYPELESS_PACKAGE_JSON]` warning (same as baseline); 0 errors.
- Viewed the full 1024x1024 render and a 300 px downscale
  (`checks/thumb-300.png`, PIL LANCZOS): the globe reads as a ringed
  planet with continents, the ball reads as a football (black pentagons on
  white, on grass), the masthead/date/headlines stay readable at 300 px
  and the decks are now legible text lines instead of a grey blur.
- All six headlines verified visually unchanged; no cell overflows (the
  tightest cells, Iran and Nvidia, end 26 px inside their boxes).
