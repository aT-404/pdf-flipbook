# PDF.js Rendering & 3D PageFlip Engine

This document details the PDF rendering worker setup, high-DPI scaling, lazy loading strategy, and 3D page-flip animation integration.

---

## 1. Bundled Local PDF.js Web Worker

To ensure independence from external CDN availability, the PDF.js web worker file is bundled directly in the application at `public/pdf.worker.min.mjs`:

```ts
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}
```

---

## 2. High-DPI Retina Scaling

Canvas resolution is scaled dynamically according to `window.devicePixelRatio` and current zoom level:

```ts
const dpr = window.devicePixelRatio || 1;
const viewport = page.getViewport({ scale: baseScale * zoom * dpr });

canvas.width = viewport.width;
canvas.height = viewport.height;
canvas.style.width = `${viewport.width / dpr}px`;
canvas.style.height = `${viewport.height / dpr}px`;
```

This guarantees that vector text remains sharp regardless of screen pixel density or zoom state.

---

## 3. Lazy Loading & Memory Management Strategy

To prevent high memory consumption on large PDF documents (e.g. 100+ pages):

1. **Active Render Range**: Pages are only rendered onto HTML5 Canvases if they fall within a window of active page + adjacent pages (`currentPage - 3` to `currentPage + 4`).
2. **Task Cancellation**: Unmounting or scrolling past a page cancels the active PDF.js render task (`renderTask.cancel()`).
3. **Canvas Buffer Cleanup**: Distant canvases display lightweight numeric placeholders until scrolled back into range.

---

## 4. 3D PageFlip Animation Engine

The viewer integrates `stpageflip` (`page-flip` library):

- **Desktop Spread**: 2-page book spread with realistic book spine depth and corner drag interaction.
- **Mobile Viewport**: Automatic single-page portrait layout.
- **Accessibility & Reduced Motion**: Automatically disables 3D animations when `prefers-reduced-motion` is detected.
