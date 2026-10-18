# ResourceScout – Chrome Extension (Manifest V3)

ResourceScout is a powerful Manifest V3 Chrome Extension that scans web pages for access restrictions, outputs an explainable 0–100 strictness score with protection breakdowns, and extracts PDFs, images, media, canvases, and blob streams already received by your browser session.

---

## Key Features

1. **Restriction & Complexity Detector (0–100 Score)**:
   - Evaluates right-click / selection / copy event traps (`contextmenu`, `copy`, `selectstart`, `dragstart`, `keydown`).
   - Identifies CSS protections (`user-select: none`, `pointer-events: none`) & transparent image overlays.
   - Detects custom embedded document viewers (PDF.js, Google Docs Viewer, blob embeds).
   - Identifies HTML5 `<canvas>` document renderers & CORS tainted canvases.
   - Flags DRM / EME hardware encryption (`navigator.requestMediaKeySystemAccess`) as non-downloadable content.

2. **Multi-Layer Resource Extraction Engine**:
   - **DOM Layer**: Extracts `<img>`, `<picture>`, responsive `srcset`, CSS background images, SVG vector page images, `<embed>`, `<object>`, `<iframe>` PDFs, `<canvas>` elements, and recursive Shadow DOM roots.
   - **Network Observation**: Monitors HTTP response headers (`application/pdf`, `image/*`, `video/*`, `audio/*`, `font/*`).
   - **In-Page Blob Fetcher**: Fetches isolated `blob:` streams inside the active document page context to convert them into downloadable Data URLs.

3. **Offscreen Bulk ZIP Exporter & Custom Templating**:
   - Uses Chrome MV3 **Offscreen Documents** with **JSZip** to generate ZIP archives without service worker termination.
   - Real-time progress bar streaming percentage and byte progress to the extension popup.
   - Customizable filename templates (e.g. `{title}_{type}_{index}.{ext}`).

4. **Sleek React + Tailwind UI**:
   - Glassmorphic popup card showing strictness score dial, category pills (PDFs, Images, Canvas, Media), search bar, thumbnail resource grid, and ethical notice banner: *"Download only content you have the right to save."*
   - Options page for customizing rubric weights and filter thresholds.

---

## Project Architecture

```
Chrome extension pdf downloader/
├── manifest.json                  # MV3 Configuration with service worker, offscreen, and content scripts
├── vite.config.ts                 # Rollup build script targeting dist/
├── public/
│   └── default-rubric.json        # Configurable scoring weights
├── test-pages/                    # Local HTML test fixtures (01 to 09)
├── src/
│   ├── shared/                    # Types, scoring engine, deduplication, template utils
│   ├── background/                # Service worker & network response logger
│   ├── content/                   # Main world script (hooks) & Isolated world script (DOM scanner)
│   ├── offscreen/                 # Offscreen JSZip archive generator
│   ├── popup/                     # React popup UI (ScoreCard, FilterToolbar, ResourceGrid, DownloadBar)
│   └── options/                   # Settings dashboard
└── tests/                         # Vitest unit test suite (9 passing tests)
```

---

## Installation & How to Load in Chrome

1. **Install Dependencies & Build**:
   ```bash
   npm install
   npm run build
   ```

2. **Load Extension in Chrome**:
   1. Open Google Chrome and navigate to `chrome://extensions/`.
   2. Enable **Developer mode** toggle in the top-right corner.
   3. Click **Load unpacked**.
   4. Select the `dist/` directory inside this project folder.

3. **Testing on Local Fixtures**:
   - Open any file from `test-pages/` (e.g. `test-pages/02-rightclick-disabled.html` or `03-pdf-js-viewer.html`) in Chrome.
   - Click the ResourceScout extension icon in your toolbar to scan restrictions and download resources!

---

## Running Unit Tests

```bash
npm test
```

All 9 unit tests cover scoring rubric calculation, FNV hash primary key deduplication, URL normalization, DOM scanning, and filename template parsing.
