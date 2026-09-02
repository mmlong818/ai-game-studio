# 《空档接龙》AI 美术溯源

生成时间:2026-09-02T22:26:57.159Z  模型:gpt-image-2  接口:https://api.openai.com/v1/images/generations

所有位图均由 gpt-image-2 生成;切图、裁切与缩放由 `scripts/generate-freecell-art.mjs` 通过 Playwright Chromium canvas 完成。牌面点数由运行时以文字叠加,花色与人头来自下表切图。

## 原图

| 原图 | 尺寸 | 字节 | sha256 |
| --- | --- | --- | --- |
| assets/templates/freecell-source/cover-source.png | 1024x1536 | 2182659 | fb0900f9c0963f9b1da83fc197b5c4fe86d0daa8d10e8217ed456b263b1c98ff |
| assets/templates/freecell-source/card-back-source.png | 1024x1536 | 2762696 | 05ee9985484686e054e917767c1141b2827dc13f00274a21b930d271fce2a368 |
| assets/templates/freecell-source/suit-atlas-source.png | 1024x1024 | 1427087 | 2a8c06d1c306c58d97d840afc07616440f010b95ce960e7d5dbb1314ebd362da |
| assets/templates/freecell-source/court-atlas-source.png | 1536x1024 | 2878477 | cf50b35651fdb0756b1ce22776575a3d97d1341ab36ba78eb8309ca3a023b829 |
| assets/templates/freecell-source/background-source.png | 1024x1536 | 2821572 | e7ad33f1a206b42ff4e336f0f8acbbd0cf44e330f6acae235ca6c76113c69f73 |

## 提示词

### cover(封面)

```text
Use case: key art cover for a browser FreeCell solitaire card game.
Primary request: one vertical poster illustration. Center focus: a fanned arc of oversized playing cards floating above a soft round felt table; the cards show only large suit symbols (spade, heart, diamond, club) as glossy enamel gems, and one card is turned to show an ornate patterned back. Four small translucent glass shelves (the free cells) hover at the top, four glowing gem sockets (the foundations) at the top right, gentle sparkles and tiny star confetti.
Style/medium: premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.
Composition/framing: portrait 2:3, subject centered occupying about 70% of the frame, calm gradient sky background from lavender to mint, generous margins, no border.
Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.
```

### card-back(默认牌背)

```text
Use case: production texture for the back of a playing card in a kawaii FreeCell solitaire game.
Primary request: one full-bleed vertical playing-card back design. A deep navy field with a symmetrical ornamental lattice of tiny stars, crescent moons and four-leaf clovers in pale gold and mint enamel, a soft rounded inner frame in peach, a central round medallion with a glossy pastel star gem. Perfectly symmetrical top/bottom and left/right.
Style/medium: premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.
Composition/framing: portrait 2:3, pattern fills the entire canvas edge to edge with no outer white border, no shadow, no perspective, flat front view; keep the medallion inside the central 60%.
Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.
```

### suit-atlas(花色图集(2×2))

```text
Use case: production sprite atlas of the four playing-card suit symbols for a kawaii solitaire game.
Primary request: one perfectly aligned 2 columns by 2 rows atlas on a fully transparent background. Top-left: spade (deep navy). Top-right: heart (coral red). Bottom-left: diamond (coral red). Bottom-right: club (deep navy). Each symbol is a glossy enamel gem with one soft highlight and a thin darker outline so it stays readable at 24 pixels.
Style/medium: premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.
Composition/framing: exact 2x2 orthographic grid; cell boundaries at exactly one-half of the width and one-half of the height; each symbol centered in its cell occupying 62-70% of the cell; nothing crosses a cell boundary; no gutters, no cell backgrounds, no shadows outside the symbol.
Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.
```

### court-atlas(人头牌图集(4×3))

```text
Use case: production sprite atlas of twelve court-card characters (Jack, Queen, King of each suit) for a kawaii solitaire game.
Primary request: one perfectly aligned 4 columns by 3 rows atlas on a fully transparent background. Columns from left to right belong to spades (navy costume), hearts (coral costume), diamonds (peach-gold costume), clubs (forest-green costume). Row 1: young page boys with a small feather cap (Jack). Row 2: graceful queens with a small tiara and a flower (Queen). Row 3: bearded kings with a round crown and a scepter (King). Each character is a chibi bust portrait, front facing, holding or wearing a small suit-symbol gem matching its column.
Style/medium: premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.
Composition/framing: exact 4x3 orthographic grid; cell boundaries at exactly one-quarter, one-half and three-quarters of the width and one-third and two-thirds of the height; each character centered in its cell occupying 60-70% of the cell; nothing crosses a cell boundary; no gutters, no cell backgrounds, no shadows outside the character.
Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.
```

### background(局内背景)

```text
Use case: in-game table background for a browser FreeCell solitaire game; cards and UI will be drawn on top.
Primary request: a calm vertical background of a soft mint-teal felt card table seen straight from above, with a very subtle circular vignette, faint fabric grain and a gentle diffuse highlight near the top. Pure environment: no cards, no chips, no hands, no objects, no border frame.
Style/medium: premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.
Composition/framing: portrait 2:3, low contrast and low saturation, very soft detail so foreground cards stay readable.
Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.
```

## 交付切图

| 文件 | 来源原图 | 字节 | sha256 |
| --- | --- | --- | --- |
| assets/cover.png | cover | 2978999 | e24ecfde9a01fd6a05a169f42927c29f56d9a0b5cb91eabf1a292a9fe0ce4a43 |
| assets/card-back.png | card-back | 884969 | 8f4ca58fa139c17eb3b035658e226d639dfae155d8596c3404793c770585ffd0 |
| assets/background.png | background | 841390 | be04834d269afb170f266dd8e0c20bcf554baf26e3340c791a2c7728479c8042 |
| assets/suits/spade.png | suit-atlas | 100222 | cc32ff09fe9843828e11dfdf9ee5973d591f7ee43d53cf4ec4b4f34ecf353937 |
| assets/suits/heart.png | suit-atlas | 97957 | 84cef32adcfc1c6fdc195ed9e38307f6f397daa7026a5dad5f2ba9e8e4d7a72f |
| assets/suits/diamond.png | suit-atlas | 68108 | ebf1e2fc34adf048c721d01b2b8d153f3953fd88949e73490e66b66545dbf8ea |
| assets/suits/club.png | suit-atlas | 107249 | e9b59d5ce0d25b8edf96d2a97363459c8e05f10fa55aa1722c9d4cb3e429a392 |
| assets/courts/jack-spade.png | court-atlas | 187004 | 00c639ffce39d641717799a5209db8500aa9eeaf98fa22b29999e8c01cd4f904 |
| assets/courts/jack-heart.png | court-atlas | 182292 | 0f3fb903094083f612caeaf7f1cae7e578a006b1b0ac5c599a9ae9fe3dca4513 |
| assets/courts/jack-diamond.png | court-atlas | 184650 | 95fbcf5f7bc97843d6a01aac73704e9cd7b98ab254afa80aa0c650c43d0a2dfb |
| assets/courts/jack-club.png | court-atlas | 185361 | 04accc6a1510475046a63384c4cbc87d2367dcc074a67b951df60d1818d951f2 |
| assets/courts/queen-spade.png | court-atlas | 217124 | f59437048846a3db9f4b4b905808bee620cf8c672196d7f4f84751513292c39b |
| assets/courts/queen-heart.png | court-atlas | 214521 | 52f1f7cfdddee7faa932328f75771b91e655696520c2e3ab5eb639b8807f87bf |
| assets/courts/queen-diamond.png | court-atlas | 217438 | 31e76e0eb275a60314a5fd54b845e52ae1040ebc2ea1d654fd79532b675428be |
| assets/courts/queen-club.png | court-atlas | 216154 | ed5ca2ea5bc38ea90463e888c3eba28a9a797663e32c1fd7e3811c4518f74233 |
| assets/courts/king-spade.png | court-atlas | 228313 | ad96da46e990db8ffd38b69b8bb8847dfbe412bb2da317d9953d258ee4d75635 |
| assets/courts/king-heart.png | court-atlas | 222800 | 069a8142b4000b7d7997615f3c7f493b48b32032f47682a40e1f333d4e592d5a |
| assets/courts/king-diamond.png | court-atlas | 220036 | ec09623237ed7add3f8ed5b1d3ec1ad69c27a1838950584466e5c210a80204c9 |
| assets/courts/king-club.png | court-atlas | 218899 | 50b68d98d59aaa6aa33472287e39c7d7dcf511ce27851eb9e122da950a94a034 |
