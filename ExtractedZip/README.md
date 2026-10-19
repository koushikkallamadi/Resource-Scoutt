1# ResourceScout – Chrome Extension (Manifest V3)

**ResourceScout** is a free Chrome extension that lets you download any resource you see on a web page – PDFs, images, videos, audio, fonts, SVGs, and even canvas‑drawn content – with a single click. It also tells you how restrictive a page is (e.g., right‑click blocks, overlay ads) by showing a simple 0‑100 score.

---

## Why you’ll love it
- **One‑click downloads** – No right‑click menus, no hidden buttons. Just click the extension icon and everything is saved to your *Downloads* folder.
- **All file types** – PDFs, pictures, videos, audio files, fonts, SVGs, and even HTML5 canvas or blob streams.
- **Works on protected pages** – Bypasses right‑click‑disable scripts, overlay divs, lazy‑load galleries, and DRM‑style viewers.
- **No ads, no tracking** – The extension is < 250 KB, open‑source, and does not send any data to a server.
- **Built with React & Tailwind** – A clean, glass‑morphic popup shows a score dial, resource categories, and a preview grid.

---

## Quick install (no $5 Chrome Store fee)
1. **Download the latest release**: https://github.com/koushikkallamadi/Resource-Scoutt/releases/latest
2. Extract the ZIP to a folder, e.g., `C:\Users\YourName\Downloads\ResourceScout`.
3. Open Chrome and go to `chrome://extensions/`.
4. Enable **Developer mode** (top‑right toggle).
5. Click **Load unpacked** and select the `dist/` folder inside the extracted directory.
6. (Optional) Pin the extension icon for easy access.

---

## How to use
1. Open any page that contains a PDF, image, video, or other media.
2. Click the **ResourceScout** button on the toolbar.
3. The popup shows a **strictness score** (0 = no restrictions, 100 = heavily protected) and lists all detected resources.
4. Tick the resources you want and press **Download** – they are saved instantly to your default *Downloads* folder.

---

## Development & contributions
- **Run locally**: `npm install && npm run dev` (the source uses Vite + React). 
- **Run tests**: `npm test` – the suite includes 9 passing Vitest tests.
- Feel free to open issues or submit pull requests – all code is open‑source under the MIT license.

---

## License
MIT © 2026 Koushik Kallamadi

---

*For more details, check the `src/` folder, the `test-pages/` examples, and the full documentation on the GitHub repo.*

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

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/Resource-Scoutt.git
   cd Resource-Scoutt
   ```
3. **Create a new branch** for your work:
   ```bash
   git checkout -b my-feature
   ```
4. **Make your changes** – add features, fix bugs, improve docs, etc.
5. **Run tests** to ensure everything passes:
   ```bash
   npm test
   ```
6. **Commit your changes** with a clear message:
   ```bash
   git add .
   git commit -m "Brief description of what you did"
   ```
7. **Push to your fork**:
   ```bash
   git push origin my-feature
   ```
8. **Open a Pull Request** on the original repository.
   - Describe what you changed and why.
   - Link any related issues.

### Code style & guidelines
- Use Prettier/ESLint formatting (`npm run lint`).
- Keep the UI consistent with the existing Tailwind design.
- Write or update tests for new functionality.

Thank you for helping make ResourceScout better! 🎉
