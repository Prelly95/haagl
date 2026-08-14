# HAAGL

**HTML As A Graphics Library** — Single-file HTML and SVG utilities for browser-based visualization and tools.

Each tool stands alone in one HTML file. No build step. No dependencies. No installation. Open the file in a browser and use it.

## Tools

### Pixel Icon Creator
Draw monochrome LCD bitmaps. Export as C/C++ headers for embedded UI code.

### BDF Font Metric Viewer
View BDF font metrics, glyph bitmaps, and kerning data.

### IQ Waveform Viewer
Display complex-valued IQ samples and frequency spectra for RF and SDR work.

## Use a tool

Get the repository. Open a tool in your browser.

```bash
git clone https://github.com/yourusername/haagl.git
cd haagl
# Open the tool
open tools/pixel-icon-creator.html
```

## Why?

- **Claude writes HTML and JS well** — Use Claude to generate each tool. Get working code you can test in the browser immediately.
- **No setup** — Single file, no dependencies, no build step.
- **Share easily** — Send a link or file to anyone.
- **Keep versions** — Archive tools you use often.

## Add new tools

Place new utilities in the `tools/` folder. Name them `tool-name.html`.
