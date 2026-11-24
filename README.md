# THE WORLD TODAY — 24 November 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org/)
[![make.fun bounty](https://img.shields.io/badge/make.fun-news--image--20261124-blue)](https://make.fun/bounty/news-image-20261124)

Entry for the [make.fun bounty news-image-20261124](https://make.fun/bounty/news-image-20261124): sum up 24 November's world news in one image.

## The entry

A single self-contained `main.ts` (Node 22, standard library only) draws a newspaper front page for Tuesday, 24 November 2026 — masthead "THE WORLD TODAY", the date in a navy band, a lead story on Ukraine's claim of sinking a Russian warship off Libya, and five more stories in a grid (COP31 ending with no deal, Iran vowing to counter a US Hormuz blockade, Nvidia reinstating Jensen Huang as chief, the Democrats' historic 258-seat House majority, and the UK hosting the 2035 Women's World Cup), each with a short deck and a flat-colour pictogram drawn from rectangles, circles and triangles. Text is rendered with a small bitmap font embedded in the code, and the PNG is encoded by hand with `node:zlib`, so the program needs no network and no assets. It runs twice and writes byte-identical output both times.

Run it with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
