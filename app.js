import { pdfjsLib } from "./js/pdf-bootstrap.js";
import { $, hasToolPage } from "./js/dom.js";
import {
  TOOL_CONFIG,
  TOOL_ROUTES,
  TOOL_ICONS,
  TOOL_ICON_IMAGES,
  BRAND_NAME,
  BRAND_EMAIL,
  BRAND_HANDLE,
  BRAND_IMAGE_CACHE
} from "./js/constants.js";
import { showResult, setProgress, runButton } from "./js/ui.js";
import { validateFiles, downloadBlob, initUploader, imgToCanvas } from "./js/files.js";

function setupTheme() {
  const btn = $("themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
  if (!btn) return;
  btn.classList.add("theme-switch");
  btn.innerHTML = `
    <span class="theme-side theme-day" aria-hidden="true">☀️</span>
    <span class="theme-side theme-night" aria-hidden="true">🌙</span>
    <span class="theme-knob" aria-hidden="true"></span>
  `;
  const refresh = () => {
    const isDark = document.body.classList.contains("dark");
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("aria-pressed", String(isDark));
  };
  refresh();
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    refresh();
    applyBranding();
  });
}

function mountBase() {
  const slug = document.body.dataset.tool;
  if (!slug || !hasToolPage) return;
  const isResizeEditorRoute = slug === "image-resize" && window.location.pathname.includes("/image-tools/image-resize/editor");
  const isCropEditorRoute = slug === "image-crop" && window.location.pathname.includes("/image-tools/image-crop/editor");
  const isDedicatedEditorRoute = isResizeEditorRoute || isCropEditorRoute;
  document.body.classList.toggle("resize-editor-mode", isResizeEditorRoute);
  document.body.classList.toggle("crop-editor-mode", isCropEditorRoute);
  const conf = TOOL_CONFIG[slug];
  $("panelTitle").textContent = isDedicatedEditorRoute ? "" : (conf?.h1 || conf?.title || "Tool");
  $("panelDescription").textContent = isDedicatedEditorRoute ? "" : (conf?.desc || "Use this tool.");
  $("toolWorkspace").innerHTML = isDedicatedEditorRoute
    ? `<div id="toolForm"></div><progress id="toolProgress" value="0" max="100"></progress>`
    : `<div id="toolForm"></div><progress id="toolProgress" value="0" max="100"></progress><div id="toolMeta"></div>`;
  routeTool(slug);
  if (!isDedicatedEditorRoute) renderToolMeta(slug);
}

function routeTool(slug) {
  if (slug === "jpg-to-pdf") return toolJpgToPdf();
  if (slug === "merge-pdf") return toolMergePdf();
  if (slug === "compress-pdf") return toolCompressPdf();
  if (slug === "split-pdf") return toolSplitPdf();
  if (slug === "pdf-to-word") return toolPdfToWord();
  if (slug === "pdf-rotate") return toolPdfRotate();
  if (slug === "pdf-delete-pages") return toolPdfDeletePages();
  if (slug === "pdf-watermark") return toolPdfWatermark();
  if (slug === "pdf-to-jpg") return toolPdfToJpg();
  if (slug === "word-to-pdf") return toolWordToPdf();
  if (slug === "image-compress") return toolImageCompressV2();
  if (slug === "image-resize") return toolImageResize();
  if (slug === "image-crop") return toolImageCrop();
  if (slug === "qr-code-generator") return toolQr();
  if (slug === "password-generator") return toolPassword();
  if (slug === "age-calculator") return toolAgeCalculator();
  if (slug === "calculator") return toolCalculator();
  if (slug === "currency-converter") return toolCurrencyConverter();
  if (slug === "word-counter") return toolWordCounter();
  if (slug === "case-converter") return toolCaseConverter();
  if (slug === "slug-generator") return toolSlugGenerator();
  if (slug === "image-converter") return toolImageConverter();
  if (slug === "svg-to-3d") {
    void import("./js/svg-to-3d.js").then((m) => m.mountSvgTo3dTool());
    return;
  }
}

function renderToolMeta(slug) {
  const conf = TOOL_CONFIG[slug];
  const root = $("toolMeta");
  if (!root || !conf) return;
  const relatedLinks = (conf.related || [])
    .map((key) => `<a class="tool-link-chip" href="${routeToRelative(TOOL_ROUTES[key] || "/")}">${TOOL_CONFIG[key]?.title || key}</a>`)
    .join("");
  const featureCards = (conf.features || [])
    .map(
      (item) => `<article class="feature-card">
          <div class="feature-head"><span class="feature-icon">${item.icon}</span><h3>${item.title}</h3></div>
          <p>${item.text}</p>
        </article>`
    )
    .join("");
  const exampleText = conf.example || `Example: Upload your file, configure ${conf.title.toLowerCase()} options, and download the result.`;
  const relatedBlock =
    slug === "merge-pdf" || slug === "compress-pdf" || slug === "jpg-to-pdf" || slug === "split-pdf" || slug === "pdf-rotate" || slug === "pdf-delete-pages" || slug === "pdf-watermark" || slug === "pdf-to-jpg" || slug === "pdf-to-word" || slug === "word-to-pdf" || slug === "image-compress" || slug === "image-resize" || slug === "image-crop" || slug === "image-converter" || slug === "svg-to-3d" || slug === "qr-code-generator" || slug === "password-generator" || slug === "age-calculator" || slug === "calculator" || slug === "currency-converter" || slug === "word-counter" || slug === "case-converter" || slug === "slug-generator"
      ? ""
      : `<section class="meta-block">
      <h2>Related Tools</h2>
      <div class="chip-row">${relatedLinks}</div>
    </section>`;
  root.innerHTML = `
    <section class="meta-block">
      <h2>Features</h2>
      <div class="feature-grid">${featureCards}</div>
    </section>
    <section class="meta-block">
      <h2>Example usage</h2>
      <p class="muted">${exampleText}</p>
    </section>
    ${relatedBlock}
  `;
}

function routeToRelative(route) {
  const cleaned = route.endsWith("/") ? route : `${route}/`;
  const depth = window.location.pathname.split("/").filter(Boolean).length - 1;
  const prefix = depth <= 0 ? "./" : "../".repeat(depth);
  return `${prefix}${cleaned.replace(/^\//, "")}index.html`;
}

function toolJpgToPdf() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div class="row"><div><label>Page size</label><select id="size"><option>A4</option><option>Original size</option></select></div><div><label>Orientation</label><select id="ori"><option>Portrait</option><option>Landscape</option></select></div></div>
  <div id="jpgOutModeWrap" class="row" hidden>
    <div>
      <label>Output mode</label>
      <select id="jpgOutMode">
        <option value="single">Merge all JPGs into one PDF</option>
        <option value="separate">Create one PDF per JPG</option>
      </select>
    </div>
  </div>
  <div id="jpgPreview" class="merge-preview-grid"></div>
  <button id="runTool" data-label="Convert to PDF" class="btn btn-primary" type="button">Convert to PDF</button>`;
  const input = initUploader("up", ".jpg,.jpeg", true);
  let selectedJpgFiles = [];
  let draggingJpgIdx = null;
  const fileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

  const attachDragHandlers = (card, idx) => {
    card.draggable = true;
    card.addEventListener("dragstart", () => {
      draggingJpgIdx = idx;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      draggingJpgIdx = null;
      card.classList.remove("dragging");
      f.querySelectorAll(".merge-preview-card.drag-over").forEach((el) => el.classList.remove("drag-over"));
    });
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (draggingJpgIdx === null || draggingJpgIdx === idx) return;
      card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      if (draggingJpgIdx === null || draggingJpgIdx === idx) return;
      const moved = selectedJpgFiles.splice(draggingJpgIdx, 1)[0];
      selectedJpgFiles.splice(idx, 0, moved);
      renderJpgPreview(selectedJpgFiles).catch(() => {});
    });
  };

  const renderJpgPreview = async (files) => {
    const root = $("jpgPreview");
    root.innerHTML = "";
    if (!files.length) {
      $("jpgOutModeWrap").hidden = true;
      return;
    }
    $("jpgOutModeWrap").hidden = files.length <= 1;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = document.createElement("article");
      item.className = "merge-preview-card";
      item.innerHTML = `<span class="jpg-order-badge">${i + 1}</span><div class="merge-preview-pages loading">Loading image...</div><div class="merge-preview-meta"><strong>#${i + 1} ${file.name}</strong><span class="muted">${(file.size / 1024 / 1024).toFixed(2)} MB</span></div>`;
      root.appendChild(item);
      attachDragHandlers(item, i);
      try {
        const url = URL.createObjectURL(file);
        const pagesWrap = item.querySelector(".merge-preview-pages");
        pagesWrap.classList.remove("loading");
        pagesWrap.innerHTML = "";
        const thumb = document.createElement("div");
        thumb.className = "merge-page-thumb";
        const img = document.createElement("img");
        img.className = "merge-preview-img";
        img.alt = `${file.name} image`;
        img.src = url;
        thumb.appendChild(img);
        pagesWrap.appendChild(thumb);
      } catch {
        const pagesWrap = item.querySelector(".merge-preview-pages");
        pagesWrap.classList.remove("loading");
        pagesWrap.textContent = "Could not render image";
      }
    }
  };

  input.addEventListener("change", async () => {
    const incoming = Array.from(input.files || []);
    if (!incoming.length) return;
    const existing = new Set(selectedJpgFiles.map(fileKey));
    incoming.forEach((file) => {
      const key = fileKey(file);
      if (!existing.has(key)) {
        selectedJpgFiles.push(file);
        existing.add(key);
      }
    });
    input.value = "";
    await renderJpgPreview(selectedJpgFiles);
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const files = selectedJpgFiles.slice();
      const err = validateFiles(files, ["jpg", "jpeg"]);
      if (err) return showResult(err, "error");
      const { PDFDocument } = window.PDFLib;
      const ordered = files;
      const outMode = $("jpgOutModeWrap").hidden ? "single" : $("jpgOutMode").value;
      const isA4 = $("size").value === "A4";
      const landscape = $("ori").value === "Landscape";
      if (outMode === "single") {
        const pdf = await PDFDocument.create();
        for (let i = 0; i < ordered.length; i++) {
          const bytes = await ordered[i].arrayBuffer();
          const img = await pdf.embedJpg(bytes);
          const dims = isA4 ? (landscape ? [842, 595] : [595, 842]) : [img.width, img.height];
          const page = pdf.addPage(dims);
          page.drawImage(img, { x: 0, y: 0, width: dims[0], height: dims[1] });
          setProgress(Math.round(((i + 1) / ordered.length) * 100));
        }
        downloadBlob(new Blob([await pdf.save()]), "jpg-to-pdf.pdf");
      } else {
        for (let i = 0; i < ordered.length; i++) {
          const pdf = await PDFDocument.create();
          const bytes = await ordered[i].arrayBuffer();
          const img = await pdf.embedJpg(bytes);
          const dims = isA4 ? (landscape ? [842, 595] : [595, 842]) : [img.width, img.height];
          const page = pdf.addPage(dims);
          page.drawImage(img, { x: 0, y: 0, width: dims[0], height: dims[1] });
          const safeName = ordered[i].name.replace(/\.(jpe?g)$/i, "");
          downloadBlob(new Blob([await pdf.save()]), `${safeName || `image-${i + 1}`}.pdf`);
          setProgress(Math.round(((i + 1) / ordered.length) * 100));
        }
      }
      showResult("PDF generated successfully.");
    } catch {
      showResult("Conversion failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolMergePdf() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <p class="muted">Preview shows each PDF’s pages (scroll horizontally inside a card). Drag cards up or down the list to set merge order, or scroll the preview panel when you have many files.</p>
  <p id="stats" class="muted"></p>
  <div class="merge-preview-scroll"><div id="mergePreview" class="merge-preview-grid"></div></div>
  <button id="runTool" data-label="Merge PDF" class="btn btn-primary" type="button">Merge PDF</button>`;
  const input = initUploader("up", ".pdf", true);
  const MAX_MERGE_FILES = 100;
  let selectedMergeFiles = [];
  const fileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;
  const updateMergeCardLabels = () => {
    const root = $("mergePreview");
    if (!root) return;
    root.querySelectorAll(".merge-preview-card").forEach((card, i) => {
      const strong = card.querySelector(".merge-preview-meta strong");
      const name = card.dataset.mergeName || "";
      if (strong && name) strong.textContent = `#${i + 1} ${name}`;
    });
  };
  const bindMergePreviewDragDrop = (root) => {
    let dragEl = null;
    const clearDragUi = () => {
      dragEl = null;
      root.querySelectorAll(".merge-preview-card").forEach((c) => {
        c.classList.remove("dragging", "drag-over");
      });
    };
    root.querySelectorAll(".merge-preview-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        dragEl = card;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.dataset.mergeKey || "");
      });
      card.addEventListener("dragend", () => clearDragUi());
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("dragenter", (e) => {
        e.preventDefault();
        if (card !== dragEl) card.classList.add("drag-over");
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) card.classList.remove("drag-over");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!dragEl || dragEl === card) return;
        const cards = Array.from(root.querySelectorAll(".merge-preview-card"));
        const from = cards.indexOf(dragEl);
        const to = cards.indexOf(card);
        if (from === -1 || to === -1) return;
        const [movedFile] = selectedMergeFiles.splice(from, 1);
        selectedMergeFiles.splice(to, 0, movedFile);
        if (from < to) card.after(dragEl);
        else card.before(dragEl);
        clearDragUi();
        updateMergeCardLabels();
      });
    });
  };
  const refreshMergeUi = async () => {
    let total = 0;
    for (const file of selectedMergeFiles) {
      const src = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      total += src.getPageCount();
    }
    $("stats").textContent = `${selectedMergeFiles.length} files selected. Total pages: ${total}`;
    await renderMergePreview(selectedMergeFiles);
  };
  const renderMergePreview = async (files) => {
    const root = $("mergePreview");
    root.innerHTML = "";
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = document.createElement("article");
      item.className = "merge-preview-card";
      item.draggable = true;
      item.dataset.mergeKey = fileKey(file);
      item.dataset.mergeName = file.name;
      item.title = "Drag to reorder in merge list";
      item.innerHTML = `<div class="merge-preview-pages loading">Loading pages...</div><div class="merge-preview-meta"><strong>#${i + 1} ${file.name}</strong><span class="muted">Reading pages...</span></div>`;
      root.appendChild(item);
      try {
        const bytes = await file.arrayBuffer();
        const src = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageCount = src.getPageCount();
        item.querySelector(".merge-preview-meta .muted").textContent = `${pageCount} pages`;

        const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        const pagesWrap = item.querySelector(".merge-preview-pages");
        pagesWrap.classList.remove("loading");
        pagesWrap.innerHTML = "";
        const targetWidth = 120;
        const dpr = window.devicePixelRatio || 1;
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const baseViewport = page.getViewport({ scale: 1 });
          const baseScale = Math.max(0.6, targetWidth / Math.max(1, baseViewport.width));
          const viewport = page.getViewport({ scale: baseScale * dpr });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          const img = document.createElement("img");
          img.className = "merge-preview-img";
          img.draggable = false;
          img.alt = `${file.name} page ${p}`;
          img.src = canvas.toDataURL("image/png");
          const thumb = document.createElement("div");
          thumb.className = "merge-page-thumb";
          thumb.innerHTML = `<span class="merge-page-no">${p}</span>`;
          thumb.appendChild(img);
          pagesWrap.appendChild(thumb);
        }
      } catch {
        const pagesWrap = item.querySelector(".merge-preview-pages");
        pagesWrap.classList.remove("loading");
        pagesWrap.textContent = "Could not render pages";
        item.querySelector(".merge-preview-meta .muted").textContent = "Could not read this PDF";
      }
    }
    bindMergePreviewDragDrop(root);
  };
  input.addEventListener("change", async () => {
    const incoming = Array.from(input.files || []);
    if (!incoming.length) return;
    if (selectedMergeFiles.length >= MAX_MERGE_FILES) {
      input.value = "";
      showResult(`Maximum ${MAX_MERGE_FILES} PDF files allowed.`, "error");
      return;
    }
    const existing = new Set(selectedMergeFiles.map(fileKey));
    let limitReached = false;
    incoming.forEach((file) => {
      if (selectedMergeFiles.length >= MAX_MERGE_FILES) {
        limitReached = true;
        return;
      }
      const key = fileKey(file);
      if (!existing.has(key)) {
        selectedMergeFiles.push(file);
        existing.add(key);
      }
    });
    if (limitReached) showResult(`Maximum ${MAX_MERGE_FILES} PDF files allowed.`, "error");
    input.value = "";
    try {
      await refreshMergeUi();
    } catch {
      showResult("Could not read one or more selected PDFs.", "error");
    }
  });
  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const files = selectedMergeFiles.slice();
      const err = validateFiles(files, ["pdf"]);
      if (err) return showResult(err, "error");
      const out = await window.PDFLib.PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const src = await window.PDFLib.PDFDocument.load(await files[i].arrayBuffer(), { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      downloadBlob(new Blob([await out.save()]), "merged.pdf");
      showResult("Merged PDF downloaded.");
    } catch {
      showResult("PDF merge failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolCompressPdf() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <label for="cmpQ">Compression / quality</label>
  <input id="cmpQ" type="range" min="0" max="100" step="1" value="100">
  <div class="compress-meta">
    <span>Original size: <strong id="cmpOrigOut">-</strong></span>
    <span>Output size (matches download): <strong id="cmpEstOut">-</strong></span>
  </div>
  <div id="compressFileCard" class="compress-file-card" hidden>
    <strong id="cmpFileName"></strong>
    <span class="muted">Quality: <span id="cmpQOut">100%</span></span>
    <span class="muted">Resolution drop: <span id="cmpResOut">0%</span></span>
  </div>
  <div id="compressPreviewWrap" class="compress-preview-wrap" hidden>
    <div class="compress-preview-card">
      <p class="muted">Page 1</p>
      <canvas id="cmpNewCanvas" class="compress-preview-canvas"></canvas>
    </div>
  </div>
  <p id="sizes" class="muted"></p>
  <button id="runTool" data-label="Compress PDF" class="btn btn-primary" type="button">Compress PDF</button>`;
  const input = initUploader("up", ".pdf", false);
  let sourceBytes = null;
  let sourceFile = null;
  let previewToken = 0;
  let compressCacheKey = "";
  let compressCachedBytes = null;
  let estimateDebounce = null;
  let estimateGen = 0;

  const getSettings = () => {
    const q = Math.max(0, Math.min(100, Number($("cmpQ").value) || 0));
    const norm = q / 100;
    return {
      qualityPercent: q,
      renderScale: 0.35 + norm * 0.65,
      jpegQuality: 0.45 + norm * 0.5
    };
  };

  const compressCacheKeyFor = (file, cfg) =>
    file ? `${file.name}|${file.size}|${file.lastModified}|${cfg.qualityPercent}` : "";

  const buildCompressedPdfBytes = async (bytes, cfg, onProgress) => {
    if (cfg.qualityPercent >= 100) {
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      return u8.slice();
    }
    const src = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const out = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= src.numPages; i++) {
      const page = await src.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scaled = page.getViewport({ scale: cfg.renderScale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(scaled.width));
      canvas.height = Math.max(1, Math.floor(scaled.height));
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: scaled }).promise;
      const jpgBlob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", cfg.jpegQuality));
      const jpgBytes = await jpgBlob.arrayBuffer();
      const embedded = await out.embedJpg(jpgBytes);
      const outPage = out.addPage([base.width, base.height]);
      outPage.drawImage(embedded, { x: 0, y: 0, width: base.width, height: base.height });
      if (typeof onProgress === "function") onProgress(Math.round((i / src.numPages) * 100));
    }
    return out.save({ useObjectStreams: true });
  };

  const formatSizeDetailed = (bytes) => {
    const n = Math.max(0, Number(bytes) || 0);
    const units = ["B", "KB", "MB", "GB"];
    let value = n;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    const pretty = idx === 0 ? `${Math.round(value)} ${units[idx]}` : `${value.toFixed(2)} ${units[idx]}`;
    const mb = `${(n / 1024 / 1024).toFixed(2)} MB`;
    const exact = `${n.toLocaleString()} bytes`;
    return `${pretty} | ${mb} (${exact})`;
  };

  const renderCanvasForPage = async (page, scale, canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    await page.render({ canvasContext: ctx, viewport }).promise;
  };

  const refreshVisualPreview = async () => {
    if (!sourceBytes) return;
    const token = ++previewToken;
    const cfg = getSettings();
    const pdf = await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
    const page = await pdf.getPage(1);
    if (token !== previewToken) return;

    const out = $("cmpNewCanvas");
    const baseScale = 1;
    const dpr = window.devicePixelRatio || 1;
    const targetViewport = page.getViewport({ scale: baseScale * dpr });
    const targetW = Math.max(1, Math.floor(targetViewport.width));
    const targetH = Math.max(1, Math.floor(targetViewport.height));
    out.width = targetW;
    out.height = targetH;
    // At 100% quality, keep the uploaded page render as-is (no recompression pass).
    if (cfg.qualityPercent >= 100) {
      await renderCanvasForPage(page, baseScale, out);
    } else {
      const temp = document.createElement("canvas");
      await renderCanvasForPage(page, Math.max(0.25, baseScale * cfg.renderScale), temp);
      const blob = await new Promise((res) => temp.toBlob(res, "image/jpeg", cfg.jpegQuality));
      const outCtx = out.getContext("2d");
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = "high";
      if (blob && window.createImageBitmap) {
        const bmp = await createImageBitmap(blob);
        outCtx.clearRect(0, 0, out.width, out.height);
        outCtx.drawImage(bmp, 0, 0, out.width, out.height);
        bmp.close();
      } else {
        outCtx.clearRect(0, 0, out.width, out.height);
        outCtx.drawImage(temp, 0, 0, out.width, out.height);
      }
    }
    $("compressPreviewWrap").hidden = false;
  };

  const refreshCompressLabels = () => {
    const cfg = getSettings();
    $("cmpQOut").textContent = `${cfg.qualityPercent}%`;
    $("cmpResOut").textContent = `${Math.round((1 - cfg.renderScale) * 100)}%`;
  };

  const refreshCompressInfoSync = () => {
    refreshCompressLabels();
    if (!sourceFile) {
      $("cmpOrigOut").textContent = "-";
      $("cmpEstOut").textContent = "-";
      compressCacheKey = "";
      compressCachedBytes = null;
    } else {
      $("cmpOrigOut").textContent = formatSizeDetailed(sourceFile.size);
    }
  };

  const applyOutputSizeToUi = (byteLength, gen) => {
    if (gen !== estimateGen) return;
    $("cmpEstOut").textContent = formatSizeDetailed(byteLength);
  };

  const runOutputSizeEstimate = async () => {
    if (!sourceFile || !sourceBytes) return;
    const cfg = getSettings();
    const gen = ++estimateGen;
    const key = compressCacheKeyFor(sourceFile, cfg);
    if (cfg.qualityPercent >= 100) {
      compressCachedBytes = sourceBytes instanceof Uint8Array ? sourceBytes.slice() : new Uint8Array(sourceBytes);
      compressCacheKey = key;
      applyOutputSizeToUi(compressCachedBytes.length, gen);
      return;
    }
    $("cmpEstOut").textContent = "Calculating…";
    try {
      const built = await buildCompressedPdfBytes(sourceBytes, cfg);
      if (gen !== estimateGen) return;
      compressCachedBytes = built;
      compressCacheKey = key;
      applyOutputSizeToUi(built.length, gen);
    } catch {
      if (gen !== estimateGen) return;
      compressCacheKey = "";
      compressCachedBytes = null;
      $("cmpEstOut").textContent = "—";
    }
  };

  const scheduleOutputSizeEstimate = () => {
    clearTimeout(estimateDebounce);
    estimateDebounce = setTimeout(() => {
      runOutputSizeEstimate().catch(() => {});
    }, 380);
  };

  $("cmpQ").addEventListener("input", () => {
    refreshCompressLabels();
    if (sourceFile) {
      $("cmpOrigOut").textContent = formatSizeDetailed(sourceFile.size);
      scheduleOutputSizeEstimate();
    }
    refreshVisualPreview().catch(() => {});
  });

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["pdf"]);
    if (err) return showResult(err, "error");
    sourceFile = file;
    sourceBytes = await file.arrayBuffer();
    compressCacheKey = "";
    compressCachedBytes = null;
    $("cmpFileName").textContent = file.name;
    $("compressFileCard").hidden = false;
    $("cmpQ").value = "100";
    refreshCompressInfoSync();
    await refreshVisualPreview();
    await runOutputSizeEstimate();
    showResult("File loaded. Adjust slider to set compression.");
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const cfg = getSettings();
      const bytes = sourceBytes || await file.arrayBuffer();
      const key = compressCacheKeyFor(file, cfg);
      let finalBytes = compressCacheKey === key && compressCachedBytes ? compressCachedBytes : null;
      if (!finalBytes) {
        finalBytes = await buildCompressedPdfBytes(
          bytes,
          cfg,
          cfg.qualityPercent < 100 ? (pct) => setProgress(pct) : undefined
        );
      }
      compressCachedBytes = finalBytes;
      compressCacheKey = key;
      applyOutputSizeToUi(finalBytes.length, estimateGen);
      const before = file.size;
      const after = finalBytes.length;
      const reduction = before > 0 ? (((before - after) / before) * 100).toFixed(1) : "0.0";
      $("sizes").textContent = `Original: ${formatSizeDetailed(before)} | Compressed: ${formatSizeDetailed(after)} | Reduction: ${reduction}%`;
      setProgress(100);
      downloadBlob(new Blob([finalBytes], { type: "application/pdf" }), "compressed.pdf");
      showResult("Compressed PDF downloaded.");
    } catch {
      showResult("PDF compression failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolSplitPdf() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <label>Mode</label>
  <select id="mode">
    <option value="all">All pages separately</option>
    <option value="selected">Selected pages</option>
    <option value="range">By ranges</option>
    <option value="single">Single page</option>
  </select>
  <div id="splitThumbWrap" class="split-thumb-wrap" hidden>
    <p class="muted">Click pages to select</p>
    <div id="splitThumbGrid" class="split-thumb-grid"></div>
    <p id="splitSelectedInfo" class="muted">Selected pages: -</p>
  </div>
  <div id="splitRangeWrap">
    <label>Ranges (example: 1-3,4-6)</label><input id="ranges">
  </div>
  <div id="splitSingleWrap">
    <label>Single page</label><input id="single" type="number" min="1" value="1">
  </div>
  <div id="splitOutModeWrap">
    <label>Download output</label>
    <select id="splitOutMode">
      <option value="separate">Each result as separate PDF</option>
      <option value="single">All selected pages in one PDF</option>
    </select>
  </div>
  <button id="runTool" data-label="Split PDF" class="btn btn-primary" type="button">Split PDF</button>`;
  const input = initUploader("up", ".pdf", false);
  let sourceBytes = null;
  let pageCount = 0;
  let selectedPages = new Set();
  let splitThumbCards = [];

  const updateModeUi = () => {
    const mode = $("mode").value;
    $("splitRangeWrap").style.display = mode === "range" ? "" : "none";
    $("splitSingleWrap").style.display = mode === "single" ? "" : "none";
    $("splitOutModeWrap").style.display = mode === "all" ? "none" : "";
  };

  const parseRangesToPages = (raw) => {
    const out = new Set();
    (raw || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .forEach((r) => {
        const [aRaw, bRaw] = r.split("-");
        const a = Number((aRaw || "").trim());
        const b = Number((bRaw || "").trim());
        if (Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= a) {
          for (let p = a; p <= b; p++) if (p <= pageCount) out.add(p);
        } else if (Number.isInteger(a) && a >= 1 && a <= pageCount && !bRaw) {
          out.add(a);
        }
      });
    return out;
  };

  const pagesToRangesText = (pagesSet) => {
    const pages = Array.from(pagesSet).sort((a, b) => a - b);
    if (!pages.length) return "";
    const ranges = [];
    let start = pages[0];
    let prev = pages[0];
    for (let i = 1; i < pages.length; i++) {
      const cur = pages[i];
      if (cur === prev + 1) {
        prev = cur;
        continue;
      }
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
      prev = cur;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(",");
  };

  const paintSplitSelection = () => {
    splitThumbCards.forEach((card, idx) => {
      const p = idx + 1;
      card.classList.toggle("selected", selectedPages.has(p));
    });
    updateSelectedInfo();
  };

  const syncSelectionByMode = () => {
    const mode = $("mode").value;
    if (!pageCount) return;
    if (mode === "all") {
      selectedPages = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
    } else if (mode === "selected") {
      selectedPages = new Set();
    } else if (mode === "range") {
      selectedPages = parseRangesToPages($("ranges").value);
    } else if (mode === "single") {
      const p = Number($("single").value);
      selectedPages = Number.isInteger(p) && p >= 1 && p <= pageCount ? new Set([p]) : new Set();
    }
    paintSplitSelection();
  };

  const updateSelectedInfo = () => {
    const selected = Array.from(selectedPages).sort((a, b) => a - b);
    $("splitSelectedInfo").textContent = selected.length ? `Selected pages: ${selected.join(", ")}` : "Selected pages: -";
  };

  const renderSplitThumbs = async () => {
    if (!sourceBytes) return;
    const grid = $("splitThumbGrid");
    grid.innerHTML = "";
    splitThumbCards = [];
    selectedPages = new Set();
    updateSelectedInfo();
    const pdf = await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
    pageCount = pdf.numPages || 0;
    $("splitThumbWrap").hidden = false;
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "split-thumb-card";
      card.innerHTML = `<span class="split-thumb-no">${p}</span>`;
      const img = document.createElement("img");
      img.className = "split-thumb-img";
      img.alt = `Page ${p}`;
      img.src = canvas.toDataURL("image/jpeg", 0.88);
      card.appendChild(img);
      card.addEventListener("click", () => {
        const mode = $("mode").value;
        if (mode === "single") {
          selectedPages = new Set([p]);
          $("single").value = String(p);
          paintSplitSelection();
          return;
        }
        if (mode === "range") {
          if (selectedPages.has(p)) selectedPages.delete(p);
          else selectedPages.add(p);
          if (selectedPages.size >= 2) {
            const nums = Array.from(selectedPages).sort((a, b) => a - b);
            const min = nums[0];
            const max = nums[nums.length - 1];
            selectedPages = new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i));
          }
          $("ranges").value = pagesToRangesText(selectedPages);
          paintSplitSelection();
          return;
        }
        if (mode === "all") {
          showResult("All pages are selected automatically in this mode.");
          return;
        }
        if (selectedPages.has(p)) selectedPages.delete(p);
        else selectedPages.add(p);
        paintSplitSelection();
      });
      grid.appendChild(card);
      splitThumbCards.push(card);
    }
    syncSelectionByMode();
  };

  $("mode").addEventListener("change", () => {
    updateModeUi();
    syncSelectionByMode();
  });
  $("ranges").addEventListener("input", () => {
    if ($("mode").value === "range") syncSelectionByMode();
  });
  $("single").addEventListener("input", () => {
    if ($("mode").value === "single") syncSelectionByMode();
  });
  updateModeUi();

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["pdf"]);
    if (err) return showResult(err, "error");
    sourceBytes = await file.arrayBuffer();
    await renderSplitThumbs();
    showResult("Pages loaded.");
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const src = await window.PDFLib.PDFDocument.load(sourceBytes || await file.arrayBuffer(), { ignoreEncryption: true });
      const count = src.getPageCount();
      const mode = $("mode").value;
      let parts = [];
      if (mode === "all") parts = Array.from({ length: count }, (_, i) => [i]);
      if (mode === "selected") {
        const selected = Array.from(selectedPages).sort((a, b) => a - b).map((n) => n - 1);
        if (!selected.length) return showResult("Please select at least one page.", "error");
        parts = selected.map((idx) => [idx]);
      }
      if (mode === "single") parts = [[Number($("single").value) - 1]];
      if (mode === "range") {
        let rangeText = ($("ranges").value || "").trim();
        if (!rangeText && selectedPages.size) {
          rangeText = pagesToRangesText(selectedPages);
          $("ranges").value = rangeText;
        }
        parts = rangeText.split(",").map((r) => r.trim()).filter(Boolean).map((r) => {
          const [a, b] = r.split("-").map((n) => Number(n.trim()));
          return Array.from({ length: b - a + 1 }, (_, i) => a + i - 1);
        });
      }
      const outMode = $("splitOutMode").value;
      if (outMode === "single") {
        const out = await window.PDFLib.PDFDocument.create();
        const flat = parts.flat().filter((p) => p >= 0 && p < count);
        const pages = await out.copyPages(src, flat);
        pages.forEach((p) => out.addPage(p));
        downloadBlob(new Blob([await out.save()]), "split-selected.pdf");
        setProgress(100);
      } else {
        for (let i = 0; i < parts.length; i++) {
          const out = await window.PDFLib.PDFDocument.create();
          const pages = await out.copyPages(src, parts[i].filter((p) => p >= 0 && p < count));
          pages.forEach((p) => out.addPage(p));
          downloadBlob(new Blob([await out.save()]), `split-${i + 1}.pdf`);
          setProgress(Math.round(((i + 1) / parts.length) * 100));
        }
      }
      showResult("Split files downloaded.");
    } catch {
      showResult("Split failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolPdfToWord() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div id="pdfwPreview" class="compress-file-card" hidden>
    <strong id="pdfwFileName"></strong>
    <span class="muted">Size: <span id="pdfwFileSize"></span></span>
    <span class="muted">Pages: <span id="pdfwPageCount">-</span></span>
    <div id="pdfwThumbGrid" class="pdfw-thumb-grid"></div>
  </div>
  <p class="muted">Downloads a Word HTML document (.doc) that opens in Microsoft Word with the same page layout as your PDF (full-page pictures). Best opened in Word, not Google Docs.</p>
  <button id="runTool" data-label="Convert to Word" class="btn btn-primary" type="button">Convert to Word</button>`;
  const input = initUploader("up", ".pdf", false);
  const formatSize = (bytes) => {
    const n = Math.max(0, Number(bytes) || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };
  let previewToken = 0;

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    const preview = $("pdfwPreview");
    const thumbGrid = $("pdfwThumbGrid");
    const token = ++previewToken;
    if (!file) {
      if (preview) preview.hidden = true;
      if (thumbGrid) thumbGrid.innerHTML = "";
      return;
    }
    $("pdfwFileName").textContent = file.name;
    $("pdfwFileSize").textContent = formatSize(file.size);
    $("pdfwPageCount").textContent = "-";
    if (thumbGrid) thumbGrid.innerHTML = "";
    if (preview) preview.hidden = false;
    try {
      const err = validateFiles([file], ["pdf"]);
      if (err) return;
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      if (token !== previewToken) return;
      $("pdfwPageCount").textContent = String(pdf.numPages);
      const maxThumbs = Math.min(pdf.numPages, 6);
      for (let i = 1; i <= maxThumbs; i++) {
        const page = await pdf.getPage(i);
        if (token !== previewToken) return;
        const viewport = page.getViewport({ scale: 0.28 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (token !== previewToken) return;
        const img = document.createElement("img");
        img.className = "pdfw-thumb";
        img.alt = `PDF page ${i} preview`;
        img.src = canvas.toDataURL("image/png");
        thumbGrid?.appendChild(img);
      }
      if (pdf.numPages > maxThumbs && thumbGrid) {
        const more = document.createElement("div");
        more.className = "pdfw-thumb-more";
        more.textContent = `+${pdf.numPages - maxThumbs} more pages`;
        thumbGrid.appendChild(more);
      }
    } catch {
      // Keep preview even if page count fails.
      if (thumbGrid && !thumbGrid.children.length) {
        thumbGrid.innerHTML = `<span class="muted">Could not render PDF thumbnails.</span>`;
      }
    }
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const MAX_CANVAS_SIDE = 4096;
      const pageBlocks = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vpSize = page.getViewport({ scale: 1 });
        const wPt = Math.round(vpSize.width * 100) / 100;
        const hPt = Math.round(vpSize.height * 100) / 100;

        let renderScale = 2.25;
        let vpRender = page.getViewport({ scale: renderScale });
        while (Math.max(vpRender.width, vpRender.height) > MAX_CANVAS_SIDE && renderScale > 0.65) {
          renderScale *= 0.88;
          vpRender = page.getViewport({ scale: renderScale });
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(vpRender.width));
        canvas.height = Math.max(1, Math.floor(vpRender.height));
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport: vpRender }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        if (!dataUrl || dataUrl.length < 32) return showResult("Could not process one of the PDF pages.", "error");

        const pageBreak = i < pdf.numPages ? "page-break-after:always;mso-page-break-after:always;" : "";
        pageBlocks.push(
          `<div style="text-align:center;${pageBreak}">` +
            `<img src="${dataUrl}" width="${Math.round(wPt)}" height="${Math.round(hPt)}" ` +
            `style="width:${wPt}pt;height:${hPt}pt;" alt="Page ${i}" />` +
            `</div>`
        );
        setProgress(Math.round((i / pdf.numPages) * 100));
      }

      const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>PDF to Word</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>body{margin:18pt;font-family:Arial,sans-serif;}</style>
</head>
<body>
${pageBlocks.join("")}
</body>
</html>`;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      downloadBlob(blob, "pdf-to-word.doc");
      showResult("Word document downloaded. Open it in Microsoft Word.");
    } catch {
      showResult("Conversion failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolImageCompress() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <label for="icTarget">Target size: <strong id="icTargetOut">-</strong></label>
  <input id="icTarget" type="range" min="0.10" max="25" step="0.01" value="1.00">
  <div class="compress-meta">
    <span>Original size: <strong id="icOrigOut">-</strong></span>
    <span>Current size: <strong id="icEstOut">-</strong></span>
  </div>
  <div id="icFileCard" class="compress-file-card" hidden>
    <strong id="icFileName"></strong>
    <span class="muted">Target: <span id="icQOut">-</span></span>
    <span class="muted">Difference: <span id="icResOut">-</span></span>
  </div>
  <div id="icPreviewWrap" class="compress-preview-wrap" hidden>
    <div class="compress-preview-card">
      <p class="muted">Preview</p>
      <canvas id="icCanvas" class="compress-preview-canvas"></canvas>
    </div>
  </div>
  <p id="icSizes" class="muted"></p>
  <button id="runTool" data-label="Compress Image" class="btn btn-primary" type="button">Compress Image</button>`;
  const input = initUploader("up", ".jpg,.jpeg", false);
  let sourceFile = null;
  let previewImage = null;
  let previewToken = 0;
  let imageObjectUrl = null;
  let currentOutputBlob = null;
  let currentOutputBytes = 0;
  let lastPreviewPromise = Promise.resolve();
  let exactPreviewTimer = null;
  let lastExactToken = 0;

  const formatSizeDetailed = (bytes) => {
    const n = Math.max(0, Number(bytes) || 0);
    const units = ["B", "KB", "MB", "GB"];
    let value = n;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    const pretty = idx === 0 ? `${Math.round(value)} ${units[idx]}` : `${value.toFixed(2)} ${units[idx]}`;
    const mb = `${(n / 1024 / 1024).toFixed(2)} MB`;
    const exact = `${n.toLocaleString()} bytes`;
    return `${pretty} | ${mb} (${exact})`;
  };

  const getTargetBytes = () => {
    const mb = Math.max(0.01, Number($("icTarget").value) || 0.01);
    return Math.round(mb * 1024 * 1024);
  };

  const drawBlobPreview = async (blob, token) => {
    if (!previewImage || !blob) return;
    const nw = previewImage.naturalWidth;
    const nh = previewImage.naturalHeight;
    const out = $("icCanvas");
    const dpr = window.devicePixelRatio || 1;
    const displayW = Math.max(1, Math.floor(nw * dpr));
    const displayH = Math.max(1, Math.floor(nh * dpr));
    const ctx = out.getContext("2d");
    if (blob === sourceFile) {
      out.width = displayW;
      out.height = displayH;
      out.style.width = `${displayW}px`;
      out.style.height = `${displayH}px`;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, displayW, displayH);
      ctx.drawImage(previewImage, 0, 0, displayW, displayH);
      return;
    }
    if (window.createImageBitmap) {
      const bmp = await createImageBitmap(blob);
      if (token !== previewToken) {
        bmp.close();
        return;
      }
      out.width = Math.max(1, bmp.width);
      out.height = Math.max(1, bmp.height);
      out.style.width = `${displayW}px`;
      out.style.height = `${displayH}px`;
      const internalToDisplay = Math.min(out.width / displayW, out.height / displayH);
      ctx.imageSmoothingEnabled = internalToDisplay >= 0.35;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(bmp, 0, 0, out.width, out.height);
      bmp.close();
      return;
    }
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      if (token !== previewToken) return;
      out.width = Math.max(1, img.width || nw);
      out.height = Math.max(1, img.height || nh);
      out.style.width = `${displayW}px`;
      out.style.height = `${displayH}px`;
      const internalToDisplay = Math.min(out.width / displayW, out.height / displayH);
      ctx.imageSmoothingEnabled = internalToDisplay >= 0.35;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(img, 0, 0, out.width, out.height);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const buildCompressedBlob = async (scale, quality) => {
    const nw = previewImage.naturalWidth;
    const nh = previewImage.naturalHeight;
    const temp = document.createElement("canvas");
    const tw = Math.max(1, Math.floor(nw * scale));
    const th = Math.max(1, Math.floor(nh * scale));
    temp.width = tw;
    temp.height = th;
    const tctx = temp.getContext("2d");
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = "high";
    tctx.drawImage(previewImage, 0, 0, tw, th);
    const blob = await new Promise((res) => temp.toBlob(res, "image/jpeg", quality));
    return blob;
  };

  const buildBlobForTarget = async (targetBytes) => {
    if (!sourceFile || !previewImage) return sourceFile;
    if (targetBytes >= sourceFile.size) return sourceFile;
    const ratio = Math.max(0.01, targetBytes / Math.max(1, sourceFile.size));
    // Much harsher visual degradation as target gets smaller.
    // (We intentionally bias towards stronger downscaling rather than only JPEG quality.)
    const baseScale = Math.min(1, Math.max(0.05, Math.pow(ratio, 1.15)));
    let scale = baseScale;
    let quality = Math.min(0.90, Math.max(0.06, 0.05 + ratio * 0.75));
    let best = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let pass = 0; pass < 14; pass++) {
      const blob = await buildCompressedBlob(scale, quality);
      if (!blob) continue;
      const diff = Math.abs(blob.size - targetBytes);
      if (diff < bestDiff) {
        best = blob;
        bestDiff = diff;
      }
      if (diff <= Math.max(6 * 1024, targetBytes * 0.015)) break;
      if (blob.size > targetBytes) {
        if (quality > 0.08) quality *= 0.75;
        else scale = Math.max(0.05, scale * 0.82);
      } else {
        if (quality < 0.85) quality = Math.min(0.90, quality * 1.15);
        else scale = Math.min(1, scale * 1.04);
      }
    }
    return best || sourceFile;
  };

  const computeFastScale = (targetBytes) => {
    if (!sourceFile || !sourceFile.size) return 1;
    const ratio = Math.max(0.0001, Math.min(1, targetBytes / sourceFile.size));
    // Instant preview: exaggerate downscale so resolution drop is clearly visible.
    // (Exact blob is still computed shortly after slider movement.)
    return Math.min(1, Math.max(0.03, Math.pow(ratio, 1.9)));
  };

  const drawFastPreview = async (targetBytes) => {
    if (!previewImage || !previewImage.naturalWidth || !sourceFile) return;
    const token = ++previewToken;
    const scale = computeFastScale(targetBytes);

    const nw = previewImage.naturalWidth;
    const nh = previewImage.naturalHeight;
    const out = $("icCanvas");
    const dpr = window.devicePixelRatio || 1;
    const displayW = Math.max(1, Math.floor(nw * dpr));
    const displayH = Math.max(1, Math.floor(nh * dpr));

    const tw = Math.max(1, Math.floor(nw * scale));
    const th = Math.max(1, Math.floor(nh * scale));
    const temp = document.createElement("canvas");
    temp.width = tw;
    temp.height = th;
    const tctx = temp.getContext("2d");
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = "high";
    tctx.drawImage(previewImage, 0, 0, tw, th);

    // If a newer slider event arrived, abort without touching the canvas.
    if (token !== previewToken) return;

    const ctx = out.getContext("2d");
    // When strongly downscaling, disable smoothing to make the resolution loss obvious.
    ctx.imageSmoothingEnabled = scale >= 0.35;
    ctx.imageSmoothingQuality = "high";
    out.width = tw;
    out.height = th;
    out.style.width = `${displayW}px`;
    out.style.height = `${displayH}px`;
    ctx.clearRect(0, 0, tw, th);

    ctx.drawImage(temp, 0, 0, tw, th);
    $("icPreviewWrap").hidden = false;
  };

  const refreshVisualPreviewExact = async () => {
    if (!previewImage || !previewImage.naturalWidth || !sourceFile) return;
    const token = ++previewToken;
    lastExactToken = token;
    const targetBytes = getTargetBytes();

    const blob = await buildBlobForTarget(targetBytes);
    if (token !== previewToken) return;
    currentOutputBlob = blob || sourceFile;
    currentOutputBytes = currentOutputBlob.size || sourceFile.size;

    $("icEstOut").textContent = formatSizeDetailed(currentOutputBytes);
    const delta = currentOutputBytes - targetBytes;
    const deltaLabel = `${delta >= 0 ? "+" : ""}${(delta / 1024 / 1024).toFixed(2)} MB`;
    $("icQOut").textContent = `${(targetBytes / 1024 / 1024).toFixed(2)} MB`;
    $("icResOut").textContent = deltaLabel;

    await drawBlobPreview(currentOutputBlob, token);
    $("icPreviewWrap").hidden = false;
  };

  const refreshCompressInfo = () => {
    const targetBytes = getTargetBytes();
    $("icTargetOut").textContent = `${(targetBytes / 1024 / 1024).toFixed(2)} MB`;
    if (!sourceFile) {
      $("icOrigOut").textContent = "-";
      $("icEstOut").textContent = "-";
      $("icQOut").textContent = "-";
      $("icResOut").textContent = "-";
      return;
    }
    $("icOrigOut").textContent = formatSizeDetailed(sourceFile.size);
    // While user is sliding, we show the target as the current estimate.
    // Exact value comes after the heavier recompression finishes.
    $("icEstOut").textContent = formatSizeDetailed(targetBytes);
  };

  $("icTarget").addEventListener("input", () => {
    refreshCompressInfo();
    const targetBytes = getTargetBytes();
    // Instant UI reaction: update estimated current size to the target immediately.
    $("icEstOut").textContent = formatSizeDetailed(targetBytes);
    $("icQOut").textContent = `${(targetBytes / 1024 / 1024).toFixed(2)} MB`;
    $("icResOut").textContent = "0.00 MB";
    drawFastPreview(targetBytes).catch(() => {});

    // Exact recompression is heavier; run it shortly after slider movement.
    if (exactPreviewTimer) clearTimeout(exactPreviewTimer);
    exactPreviewTimer = setTimeout(() => {
      refreshVisualPreviewExact().catch(() => {});
    }, 180);
  });

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["jpg", "jpeg"]);
    if (err) return showResult(err, "error");
    sourceFile = file;
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl);
      imageObjectUrl = null;
    }
    imageObjectUrl = URL.createObjectURL(file);
    previewImage = new Image();
    previewImage.onload = async () => {
      $("icFileName").textContent = file.name;
      $("icFileCard").hidden = false;
      const origMb = Math.max(0.01, file.size / 1024 / 1024);
      const minMb = Math.max(0.05, Math.min(origMb, origMb * 0.1));
      $("icTarget").min = minMb.toFixed(2);
      $("icTarget").max = origMb.toFixed(2);
      $("icTarget").value = origMb.toFixed(2);
      currentOutputBlob = file;
      currentOutputBytes = file.size;
      refreshCompressInfo();
      // Instant preview on load (without waiting for exact recompression).
      const tBytes = getTargetBytes();
      $("icEstOut").textContent = formatSizeDetailed(tBytes);
      $("icQOut").textContent = `${(tBytes / 1024 / 1024).toFixed(2)} MB`;
      $("icResOut").textContent = "0.00 MB";
      $("icPreviewWrap").hidden = false;
      drawFastPreview(tBytes).catch(() => {});
      if (exactPreviewTimer) clearTimeout(exactPreviewTimer);
      exactPreviewTimer = setTimeout(() => {
        refreshVisualPreviewExact().catch(() => {});
      }, 220);
      showResult("Image loaded. Move slider to target size.");
    };
    previewImage.onerror = () => showResult("Could not read image file.", "error");
    previewImage.src = imageObjectUrl;
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["jpg", "jpeg"]);
      if (err) return showResult(err, "error");
      if (!previewImage || !previewImage.naturalWidth) return showResult("Please wait for the image to load.", "error");
      // Ensure download uses the latest slider position output.
      await refreshVisualPreviewExact();
      const blob = currentOutputBlob || file;
      const before = file.size;
      const after = currentOutputBytes || blob.size;
      const reduction = before > 0 ? (((before - after) / before) * 100).toFixed(1) : "0";
      $("icSizes").textContent = `Original: ${formatSizeDetailed(before)} | Compressed: ${formatSizeDetailed(after)} | Reduction: ${reduction}%`;
      setProgress(100);
      const safe = file.name.replace(/\.[^.]+$/, "") || "compressed";
      downloadBlob(blob, `${safe}-compressed.jpg`);
      showResult("Compressed image downloaded.");
    } catch {
      showResult("Image compression failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolImageCompressV2() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div class="ic-top-area">
    <div class="row ic-slider-row">
      <div>
        <label>Current size: <strong id="icCurOut">-</strong></label>
        <input id="icScale" type="range" min="10" max="100" step="1" value="100">
      </div>
      <div>
        <label>Resolution scale: <strong id="icScaleOut">100%</strong></label>
        <div class="muted">Drag left to reduce resolution instantly.</div>
      </div>
      <div>
        <label>Output format</label>
        <select id="icOutFmt">
          <option value="same">Same as input</option>
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
          <option value="webp">WEBP</option>
          <option value="svg">SVG</option>
        </select>
        <div id="icOutHint" class="muted"></div>
      </div>
    </div>

    <div class="compress-meta" style="margin-top:0.35rem">
      <span>Original: <strong id="icOrigOut">-</strong></span>
      <span>Estimated output: <strong id="icEstOut">-</strong></span>
    </div>

    <div id="icFileCard" class="compress-file-card" hidden>
      <strong id="icFileName"></strong>
      <span class="muted">Input: JPEG/JPG, PNG, WEBP, HEIC/HEIF, SVG | Output: Same as input / JPG / PNG / WEBP / SVG.</span>
    </div>

    <div id="icPreviewWrap" class="ic-preview-slot" hidden>
      <div class="compress-preview-card ic-preview-card">
        <p class="muted">Preview</p>
        <canvas id="icCanvas" class="compress-preview-canvas"></canvas>
      </div>
    </div>

    <p id="icSizes" class="muted ic-sizes"></p>

    <button id="runTool" data-label="Compress Image" class="btn btn-primary ic-run-btn" type="button">Compress Image</button>
  </div>`;

  // Accept more formats (best-effort decoding in the browser).
  const input = initUploader("up", ".jpg,.jpeg,.png,.webp,.heic,.heif,.svg", false);

  // State
  let sourceFile = null;
  let sourceExt = "";
  let sourceBytes = 0;
  let baseCanvas = null;
  let baseW = 0;
  let baseH = 0;
  let previewToken = 0;
  let currentOutputW = 0;
  let currentOutputH = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const drawContainToCanvas = (ctx, img, outW, outH) => {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const scale = Math.min(outW / iw, outH / ih);
    const dw = Math.max(1, Math.round(iw * scale));
    const dh = Math.max(1, Math.round(ih * scale));
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, dx, dy, dw, dh);
  };
  const getSourceExt = (name) => ((name || "").split(".").pop() || "").toLowerCase();
  let heicDecoder = null;
  let heicDecoderLoading = null;

  const setCanvasDisplaySize = (w, h) => {
    // Fit the preview into the visible slot (so the UI stays usable).
    const slot = $("icPreviewWrap");
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const slotW = rect.width || 700;
    const slotH = rect.height || 420;
    const pad = 18;
    const availW = Math.max(220, slotW - pad * 2);
    const availH = Math.max(220, slotH - pad * 2);
    const s = Math.min(1, availW / Math.max(1, w), availH / Math.max(1, h));
    const dw = Math.max(180, Math.floor(w * s));
    const dh = Math.max(140, Math.floor(h * s));
    $("icCanvas").style.width = `${dw}px`;
    $("icCanvas").style.height = `${dh}px`;
  };

  const decodeToImage = async (file) => {
    const decodeBlobToImage = async (blob) => {
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const ensureHeicDecoder = async () => {
      if (heicDecoder) return heicDecoder;
      if (!heicDecoderLoading) {
        heicDecoderLoading = import("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/+esm")
          .then((m) => (heicDecoder = m.default || m))
          .catch(() => null);
      }
      return heicDecoderLoading;
    };

    try {
      // Fast path for natively supported formats.
      return await decodeBlobToImage(file);
    } catch {
      const ext = getSourceExt(file.name);
      if (ext !== "heic" && ext !== "heif") throw new Error("decode-failed");
      const decoder = await ensureHeicDecoder();
      if (!decoder) throw new Error("heic-decoder-unavailable");
      const converted = await decoder({ blob: file, toType: "image/jpeg", quality: 0.95 });
      const outBlob = Array.isArray(converted) ? converted[0] : converted;
      if (!outBlob) throw new Error("heic-convert-failed");
      return await decodeBlobToImage(outBlob);
    }
  };

  const buildBaseCanvas = (img) => {
    const maxEdge = 2400; // cap for performance; resolution still decreases from here.
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const longer = Math.max(1, Math.max(w, h));
    const s0 = Math.min(1, maxEdge / longer);
    baseW = Math.max(1, Math.floor(w * s0));
    baseH = Math.max(1, Math.floor(h * s0));
    const c = document.createElement("canvas");
    c.width = baseW;
    c.height = baseH;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, baseW, baseH);
    baseCanvas = c;
  };

  const computeScale = () => {
    const v = Number($("icScale").value) || 100;
    $("icScaleOut").textContent = `${v}%`;
    const t = clamp(v / 100, 0.1, 1);
    // More aggressive curve so low values visibly drop resolution fast.
    return Math.pow(t, 1.6);
  };

  const renderPreview = async () => {
    if (!baseCanvas) return;
    const token = ++previewToken;
    let scale = computeScale();
    const effectiveFmt = getEffectiveOutputFormat();
    if (effectiveFmt === "svg") scale = 1;
    const keepRasterDimensions =
      sourceExt === "svg" && (effectiveFmt === "jpg" || effectiveFmt === "jpeg" || effectiveFmt === "png" || effectiveFmt === "webp");
    const outW = keepRasterDimensions ? baseW : Math.max(1, Math.floor(baseW * scale));
    const outH = keepRasterDimensions ? baseH : Math.max(1, Math.floor(baseH * scale));
    currentOutputW = outW;
    currentOutputH = outH;

    const canvas = $("icCanvas");
    // Internal resolution equals output resolution (this guarantees download matches preview).
    canvas.width = outW;
    canvas.height = outH;
    // Important: do NOT change canvas CSS size while sliding.
    // Keep preview footprint stable; only internal pixel resolution changes.

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = scale >= 0.45; // off at low scales to emphasize pixelation.
    ctx.imageSmoothingQuality = "high";

    // Draw preview while preserving output dimensions for SVG->raster conversion.
    ctx.clearRect(0, 0, outW, outH);
    if (keepRasterDimensions && scale < 0.999) {
      const tw = Math.max(1, Math.floor(baseW * scale));
      const th = Math.max(1, Math.floor(baseH * scale));
      const temp = document.createElement("canvas");
      temp.width = tw;
      temp.height = th;
      const tctx = temp.getContext("2d");
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = "high";
      tctx.clearRect(0, 0, tw, th);
      tctx.drawImage(baseCanvas, 0, 0, tw, th);
      ctx.drawImage(temp, 0, 0, outW, outH);
    } else {
      ctx.drawImage(baseCanvas, 0, 0, outW, outH);
    }

    if (token !== previewToken) return;

    // Real-size update from actual encoded blob (matches selected output settings).
    const payload = await buildOutputBlobFromCanvas(canvas, scale);
    if (payload.error) {
      $("icCurOut").textContent = "-";
      $("icEstOut").textContent = payload.error;
      return;
    }
    const previewBlob = payload.blob;
    if (token !== previewToken) return;
    const realSize = previewBlob?.size || 0;
    $("icCurOut").textContent = `${(realSize / 1024 / 1024).toFixed(2)} MB`;
    $("icEstOut").textContent = formatSizeSimple(realSize);
  };

  const formatSizeSimple = (bytes) => {
    const n = Math.max(0, Number(bytes) || 0);
    const units = ["B", "KB", "MB", "GB"];
    let v = n;
    let idx = 0;
    while (v >= 1024 && idx < units.length - 1) {
      v /= 1024;
      idx += 1;
    }
    return idx === 0 ? `${Math.round(v)} ${units[idx]}` : `${v.toFixed(2)} ${units[idx]}`;
  };

  const pickAdaptiveBgForSvgJpg = (canvas) => {
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let lumSum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 20) continue; // ignore near-transparent pixels
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Perceived luminance.
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumSum += lum;
        count += 1;
      }
      if (!count) return "#ffffff";
      const avgLum = lumSum / count;
      // Light logo/text => dark background, dark logo/text => light background.
      return avgLum >= 150 ? "#000000" : "#ffffff";
    } catch {
      return "#ffffff";
    }
  };

  const getEffectiveOutputFormat = () => {
    const outChoice = $("icOutFmt").value;
    return outChoice === "same" ? sourceExt : outChoice;
  };

  const refreshOutputFormatUi = () => {
    const fmt = getEffectiveOutputFormat();
    const isSvgOut = fmt === "svg";
    $("icScale").disabled = isSvgOut;
    $("icOutHint").textContent = isSvgOut
      ? "SVG output keeps vector data, so size usually stays the same. Choose JPG/PNG/WEBP for resolution-based compression."
      : "";
    if (isSvgOut) $("icScaleOut").textContent = "100%";
  };

  const buildOutputBlobFromCanvas = async (canvas, scale) => {
    const outChoice = $("icOutFmt").value;
    const quality = clamp(0.25 + 0.75 * scale, 0.2, 1);
    const effectiveFmt = outChoice === "same" ? sourceExt : outChoice;

    if (effectiveFmt === "jpg" || effectiveFmt === "jpeg") {
      // JPEG has no alpha channel. For SVG inputs, pick adaptive contrasting bg:
      // dark logo -> white bg, light logo -> black bg.
      const flat = document.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const fctx = flat.getContext("2d");
      const bg = sourceExt === "svg" ? pickAdaptiveBgForSvgJpg(canvas) : "#ffffff";
      fctx.fillStyle = bg;
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(canvas, 0, 0);
      return { blob: await new Promise((res) => flat.toBlob(res, "image/jpeg", quality)), ext: "jpg" };
    }
    if (effectiveFmt === "png") {
      return { blob: await new Promise((res) => canvas.toBlob(res, "image/png")), ext: "png" };
    }
    if (effectiveFmt === "webp") {
      return { blob: await new Promise((res) => canvas.toBlob(res, "image/webp", quality)), ext: "webp" };
    }
    if (effectiveFmt === "svg") {
      if (sourceExt !== "svg") return { blob: null, ext: "svg", error: "SVG output is only available for SVG input." };
      return { blob: sourceFile, ext: "svg" };
    }
    if (effectiveFmt === "heic" || effectiveFmt === "heif") {
      // Browser-side HEIC/HEIF encoding is not generally available; keep original file.
      return { blob: sourceFile, ext: sourceExt || "heic" };
    }
    return { blob: await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality)), ext: "jpg" };
  };

  $("icScale").addEventListener("input", () => {
    // No "updating..." text; render is fast (just canvas resample).
    renderPreview().catch(() => {});
  });
  $("icOutFmt").addEventListener("change", () => {
    refreshOutputFormatUi();
    renderPreview().catch(() => {});
  });

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["jpg", "jpeg", "png", "webp", "heic", "heif", "svg"]);
    if (err) return showResult(err, "error");

    try {
      runButton(true);
      sourceFile = file;
      sourceExt = getSourceExt(file.name);
      sourceBytes = file.size;
      $("icFileCard").hidden = true;
      $("icPreviewWrap").hidden = true;
      $("icFileName").textContent = file.name;
      $("icOrigOut").textContent = formatSizeSimple(sourceBytes);
      $("icSizes").textContent = "";

      const img = await decodeToImage(file);
      buildBaseCanvas(img);
      // For SVG input, default to JPG so slider compression is immediately meaningful.
      $("icOutFmt").value = sourceExt === "svg" ? "jpg" : "same";
      refreshOutputFormatUi();
      // Fix the visible canvas size once, based on original dimensions.
      $("icFileCard").hidden = false;
      $("icPreviewWrap").hidden = false;
      setCanvasDisplaySize(baseW, baseH);
      await renderPreview();
      showResult("Image loaded. Drag the slider left to reduce resolution instantly.", "ok");
    } catch {
      showResult("Could not decode the image. If this is HEIC/HEIF, check your connection and try again.", "error");
    } finally {
      runButton(false);
    }
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      if (!baseCanvas) return showResult("Upload an image first.", "error");

      const scale = computeScale(); // current slider position
      const outW = Math.max(1, Math.floor(baseW * scale));
      const outH = Math.max(1, Math.floor(baseH * scale));
      const downCanvas = document.createElement("canvas");
      downCanvas.width = outW;
      downCanvas.height = outH;
      const ctx = downCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = scale >= 0.45;
      ctx.imageSmoothingQuality = "high";
      const effectiveFmt = getEffectiveOutputFormat();
      const keepRasterDimensions =
        sourceExt === "svg" && (effectiveFmt === "jpg" || effectiveFmt === "jpeg" || effectiveFmt === "png" || effectiveFmt === "webp");
      if (keepRasterDimensions && scale < 0.999) {
        downCanvas.width = baseW;
        downCanvas.height = baseH;
        const tw = Math.max(1, Math.floor(baseW * scale));
        const th = Math.max(1, Math.floor(baseH * scale));
        const temp = document.createElement("canvas");
        temp.width = tw;
        temp.height = th;
        const tctx = temp.getContext("2d");
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = "high";
        tctx.drawImage(baseCanvas, 0, 0, tw, th);
        ctx.drawImage(temp, 0, 0, downCanvas.width, downCanvas.height);
      } else {
        ctx.drawImage(baseCanvas, 0, 0, outW, outH);
      }

      const outPayload = await buildOutputBlobFromCanvas(downCanvas, scale);
      if (outPayload.error) return showResult(outPayload.error, "error");
      const blob = outPayload.blob;
      if (!blob) return showResult("Compression failed.", "error");

      const before = sourceBytes;
      const after = blob.size;
      $("icSizes").textContent = `Original: ${formatSizeSimple(before)} | Download: ${formatSizeSimple(after)}.`;

      setProgress(100);
      const baseName = (sourceFile?.name || "image").replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${baseName}-compressed.${outPayload.ext || "jpg"}`);
      showResult("Downloaded.", "ok");
    } catch {
      showResult("Compression failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolImageResize() {
  const f = $("toolForm");
  const isEditorMode = window.location.pathname.includes("/image-tools/image-resize/editor");
  const STORAGE_KEY = "qt-image-resize-editor-payload-v1";
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isEditorMode) {
    f.innerHTML = `
    <div id="resizeUploaderWrap" class="resize-upload-wrap">
      <div id="up"></div>
      <div id="resizeUploadCard" class="resize-upload-card" hidden>
        <div class="resize-upload-row">
          <div class="resize-upload-meta">
            <strong id="resizeUploadName">-</strong>
            <span id="resizeUploadSize">-</span>
          </div>
          <div id="resizeUploadPct" class="resize-upload-pct">Uploading 0%</div>
        </div>
        <progress id="resizeUploadProgress" max="100" value="0"></progress>
      </div>
    </div>`;
    const input = initUploader("up", ".jpg,.jpeg,.png,.webp", false);
    let uploadTimer = null;
    const setUploadProgress = (v) => {
      const pct = clamp(Math.round(v), 0, 100);
      $("resizeUploadProgress").value = pct;
      $("resizeUploadPct").textContent = `Uploading ${pct}%`;
    };
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const err = validateFiles([file], ["jpg", "jpeg", "png", "webp"]);
      if (err) return showResult(err, "error");
      if (uploadTimer) clearInterval(uploadTimer);
      $("resizeUploadCard").hidden = false;
      $("resizeUploadName").textContent = file.name;
      $("resizeUploadSize").textContent = formatSize(file.size);
      setUploadProgress(0);
      const asDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!asDataUrl) return showResult("Could not read uploaded image.", "error");
      let p = 0;
      uploadTimer = setInterval(() => {
        p += Math.max(8, Math.round(Math.random() * 18));
        if (p >= 100) {
          p = 100;
          clearInterval(uploadTimer);
          setUploadProgress(100);
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: asDataUrl,
            }));
          } catch {
            showResult("Could not keep upload data for editor page. Please try a smaller image.", "error");
            return;
          }
          setTimeout(() => {
            // Force real page navigation to dedicated editor route.
            const nextUrl = new URL("./editor/index.html", window.location.href);
            window.location.assign(nextUrl.toString());
          }, 180);
        } else {
          setUploadProgress(p);
        }
      }, 90);
    });
    return;
  }

  f.innerHTML = `
  <section id="resizeEditorPage" class="resize-editor-page">
    <div class="resize-editor-header">
      <h3>Image Resize Editor</h3>
      <p class="muted">Image starts at original size. Use side/corner borders to stretch from all directions.</p>
    </div>
    <div class="resize-dimensions">
      <div class="resize-dim-chip"><span>Original</span><strong id="resizeOrigDim">-</strong></div>
      <div class="resize-dim-chip"><span>Current output</span><strong id="resizeCurDim">-</strong></div>
    </div>
    <div class="resize-editor-shell">
      <div id="resizeStage" class="resize-stage">
        <div id="resizeBox" class="resize-box">
          <img id="resizePreviewImg" alt="Resize preview">
          <span class="resize-handle resize-handle-n" data-dir="n" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-s" data-dir="s" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-e" data-dir="e" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-w" data-dir="w" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-ne" data-dir="ne" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-nw" data-dir="nw" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-se" data-dir="se" aria-hidden="true"></span>
          <span class="resize-handle resize-handle-sw" data-dir="sw" aria-hidden="true"></span>
        </div>
      </div>
      <div class="resize-side-panel">
        <details class="ratio-shortcuts" open>
          <summary>Aspect Ratio Shortcuts</summary>
          <div class="ratio-grid">
            <button class="ratio-btn" type="button" data-ratio="16:9"><span>▭</span><b>16:9</b></button>
            <button class="ratio-btn" type="button" data-ratio="1:1"><span>□</span><b>1:1</b></button>
            <button class="ratio-btn" type="button" data-ratio="9:16"><span>▯</span><b>9:16</b></button>
            <button class="ratio-btn" type="button" data-ratio="4:3"><span>▭</span><b>4:3</b></button>
            <button class="ratio-btn" type="button" data-ratio="3:2"><span>▭</span><b>3:2</b></button>
            <button class="ratio-btn" type="button" data-ratio="21:9"><span>▭</span><b>21:9</b></button>
          </div>
        </details>
        <label for="resizeWInput">Width (px)</label>
        <input id="resizeWInput" type="number" min="1" step="1">
        <label for="resizeHInput">Height (px)</label>
        <input id="resizeHInput" type="number" min="1" step="1">
        <button id="applyResizeDims" class="btn btn-ghost" type="button">Apply Size</button>
        <button id="runTool" data-label="Download" class="btn btn-primary" type="button">Download</button>
      </div>
    </div>
  </section>`;

  const payloadRaw = sessionStorage.getItem(STORAGE_KEY);
  const payload = payloadRaw ? JSON.parse(payloadRaw) : null;
  if (!payload?.dataUrl) {
    showResult("No uploaded image found. Please upload again.", "error");
    f.innerHTML = `<div class="actions"><a class="btn btn-ghost" href="../index.html">Back to upload</a></div>`;
    return;
  }

  let sourceImage = null;
  let naturalW = 0;
  let naturalH = 0;
  let outputW = 0;
  let outputH = 0;
  let baseDisplayScale = 1;
  let displayScaleX = 1;
  let displayScaleY = 1;
  let stageBaseMinHeight = 520;
  let dragState = null;

  const getExportDimensions = () => {
    let w = Math.max(1, Math.round(outputW || naturalW || 1));
    let h = Math.max(1, Math.round(outputH || naturalH || 1));
    const MAX_SIDE = 8192;
    const MAX_AREA = 268435456;
    if (w > MAX_SIDE || h > MAX_SIDE || (w * h) > MAX_AREA) {
      const sideScale = Math.min(MAX_SIDE / w, MAX_SIDE / h, 1);
      const areaScale = Math.min(1, Math.sqrt(MAX_AREA / (w * h)));
      const safeScale = Math.min(sideScale, areaScale);
      w = Math.max(1, Math.floor(w * safeScale));
      h = Math.max(1, Math.floor(h * safeScale));
    }
    return { w, h };
  };
  const getEditorScale = () => {
    const stage = $("resizeStage");
    if (!stage || !outputW || !outputH) return 1;
    const stageRect = stage.getBoundingClientRect();
    const targetW = Math.max(320, stageRect.width - 8);
    const targetH = Math.max(260, stageRect.height - 8);
    // Keep a stable base scale so size differences stay visible.
    const baseW = outputW * baseDisplayScale;
    const baseH = outputH * baseDisplayScale;
    const fitX = targetW / Math.max(1, baseW);
    const fitY = targetH / Math.max(1, baseH);
    const overflowScale = Math.min(1, fitX, fitY);
    return {
      sx: Math.max(0.05, baseDisplayScale * overflowScale),
      sy: Math.max(0.05, baseDisplayScale * overflowScale),
    };
  };
  const applyHorizontalZoomGuard = (visualImageWidth) => {
    const shell = f.querySelector(".resize-editor-shell");
    const panel = f.querySelector(".resize-side-panel");
    const page = $("resizeEditorPage");
    if (!shell || !panel || !page) return;
    const availableW = Math.max(320, page.clientWidth - 8);
    const panelW = Math.max(120, panel.offsetWidth || 180);
    const requiredW = Math.max(260, visualImageWidth) + panelW + 12;
    const zoom = Math.max(0.55, Math.min(1, availableW / requiredW));
    // Chromium-based browsers support zoom and it preserves layout flow.
    shell.style.zoom = `${zoom}`;
  };
  const renderResizeBox = () => {
    const box = $("resizeBox");
    const stage = $("resizeStage");
    if (!box || !stage || !outputW || !outputH) return;
    const s = getEditorScale();
    displayScaleX = s.sx;
    displayScaleY = s.sy;
    const vw = Math.max(1, Math.round(outputW * displayScaleX));
    const vh = Math.max(1, Math.round(outputH * displayScaleY));
    box.style.width = `${vw}px`;
    box.style.height = `${vh}px`;
    applyHorizontalZoomGuard(vw);
    // If user keeps growing past vertical boundary, extend page vertically.
    const nextMinH = Math.max(stageBaseMinHeight, vh + 24);
    stage.style.minHeight = `${nextMinH}px`;
  };
  const updateResizeReadout = () => {
    const { w, h } = getExportDimensions();
    $("resizeOrigDim").textContent = `${naturalW} x ${naturalH}px`;
    $("resizeCurDim").textContent = `${w} x ${h}px`;
    $("resizeWInput").value = String(w);
    $("resizeHInput").value = String(h);
  };
  const fitInitialBox = () => {
    outputW = Math.max(1, Math.round(naturalW));
    outputH = Math.max(1, Math.round(naturalH));
    // Initial screen sizing reference (e.g. 1000px can appear around ~600px).
    const stage = $("resizeStage");
    if (stage) {
      const stageRect = stage.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(stageRect.width * 0.68));
      const targetH = Math.max(260, Math.floor(stageRect.height * 0.68));
      baseDisplayScale = Math.min(1, targetW / outputW, targetH / outputH);
      baseDisplayScale = Math.max(0.08, baseDisplayScale);
    } else {
      baseDisplayScale = 0.6;
    }
    renderResizeBox();
  };
  const applyManualSize = () => {
    if (!naturalW || !naturalH) return;
    const wVal = Number($("resizeWInput").value);
    const hVal = Number($("resizeHInput").value);
    if (!Number.isFinite(wVal) || !Number.isFinite(hVal) || wVal < 1 || hVal < 1) return;
    outputW = clamp(Math.round(wVal), 1, 12000);
    outputH = clamp(Math.round(hVal), 1, 12000);
    renderResizeBox();
    updateResizeReadout();
  };
  const applyRatioShortcut = (ratioLabel) => {
    const parts = String(ratioLabel || "").split(":").map((n) => Number(n));
    const rw = parts[0];
    const rh = parts[1];
    if (!Number.isFinite(rw) || !Number.isFinite(rh) || rw <= 0 || rh <= 0) return;
    const anchor = Math.max(1, Math.max(outputW || naturalW || 1, outputH || naturalH || 1));
    let nextW = anchor;
    let nextH = Math.round((anchor * rh) / rw);
    if (nextH < 1) nextH = 1;
    if (nextW > 12000 || nextH > 12000) {
      const s = Math.min(12000 / nextW, 12000 / nextH);
      nextW = Math.max(1, Math.floor(nextW * s));
      nextH = Math.max(1, Math.floor(nextH * s));
    }
    outputW = nextW;
    outputH = nextH;
    renderResizeBox();
    updateResizeReadout();
  };
  const startResizeDrag = (ev) => {
    const handle = ev.target?.closest?.(".resize-handle");
    if (!handle) return;
    const box = $("resizeBox");
    if (!box) return;
    ev.preventDefault();
    const dir = handle.getAttribute("data-dir");
    dragState = {
      dir,
      startX: ev.clientX,
      startY: ev.clientY,
      startOutW: outputW,
      startOutH: outputH,
      scaleX: displayScaleX || 1,
      scaleY: displayScaleY || 1,
    };
    document.body.style.userSelect = "none";
  };
  const onResizeDrag = (ev) => {
    if (!dragState) return;
    const dx = ev.clientX - dragState.startX;
    const dy = ev.clientY - dragState.startY;
    const logicalDx = dx / Math.max(0.1, dragState.scaleX);
    const logicalDy = dy / Math.max(0.1, dragState.scaleY);
    let nextW = dragState.startOutW;
    let nextH = dragState.startOutH;
    if (dragState.dir.includes("e")) nextW = dragState.startOutW + logicalDx;
    if (dragState.dir.includes("w")) nextW = dragState.startOutW - logicalDx;
    if (dragState.dir.includes("s")) nextH = dragState.startOutH + logicalDy;
    if (dragState.dir.includes("n")) nextH = dragState.startOutH - logicalDy;
    outputW = clamp(Math.round(nextW), 1, 12000);
    outputH = clamp(Math.round(nextH), 1, 12000);
    renderResizeBox();
    updateResizeReadout();
  };
  const endResizeDrag = () => {
    if (!dragState) return;
    dragState = null;
    document.body.style.userSelect = "";
  };

  sourceImage = new Image();
  sourceImage.decoding = "async";
  sourceImage.src = payload.dataUrl;
  sourceImage.onload = () => {
    naturalW = sourceImage.naturalWidth || sourceImage.width;
    naturalH = sourceImage.naturalHeight || sourceImage.height;
    $("resizePreviewImg").src = payload.dataUrl;
    const stage = $("resizeStage");
    if (stage) {
      const rect = stage.getBoundingClientRect();
      stageBaseMinHeight = Math.max(520, Math.round(rect.height || 520));
    }
    fitInitialBox();
    updateResizeReadout();
  };
  sourceImage.onerror = () => {
    showResult("Could not load image preview.", "error");
  };

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      if (!sourceImage || !naturalW || !naturalH) return showResult("Please upload an image first.", "error");
      const { w, h } = getExportDimensions();
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ext = (payload.name.split(".").pop() || "").toLowerCase();
      const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
      const mime = mimeMap[ext] || payload.type || "image/jpeg";
      const ctx = c.getContext("2d");
      if (mime !== "image/png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(sourceImage, 0, 0, w, h);
      const q = mime === "image/png" ? undefined : 0.92;
      const blob = await new Promise((res) => c.toBlob(res, mime, q));
      if (!blob) return showResult("Could not create output file.", "error");
      downloadBlob(blob, `resized.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`);
      showResult("Resized image downloaded.");
    } catch {
      showResult("Resize failed.", "error");
    } finally {
      runButton(false);
    }
  });

  $("resizeBox").addEventListener("pointerdown", startResizeDrag);
  window.addEventListener("pointermove", onResizeDrag);
  window.addEventListener("pointerup", endResizeDrag);
  window.addEventListener("pointercancel", endResizeDrag);
  window.addEventListener("resize", () => {
    if (!outputW || !outputH) return;
    renderResizeBox();
  });
  $("applyResizeDims").addEventListener("click", applyManualSize);
  $("resizeWInput").addEventListener("change", applyManualSize);
  $("resizeHInput").addEventListener("change", applyManualSize);
  f.querySelectorAll(".ratio-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyRatioShortcut(btn.dataset.ratio));
  });
}

function toolQr() {
  const f = $("toolForm");
  f.innerHTML = `<label>Text or URL</label><input id="txt">
  <div class="row">
    <div>
      <label>Size: <strong id="sizeVal">280px</strong></label>
      <input id="size" type="range" min="140" max="700" step="10" value="280">
    </div>
    <div class="color-card">
      <label>Foreground</label>
      <div class="color-input-wrap">
        <input id="fg" type="color" value="#000000">
      </div>
    </div>
    <div class="color-card">
      <label>Background</label>
      <div class="color-input-wrap">
        <input id="bg" type="color" value="#ffffff">
      </div>
    </div>
  </div>
  <label>Preview</label>
  <div id="qrPreview" class="qr-preview-box"><p id="qrHint" class="muted">Type text or URL to preview QR</p><img id="qrPreviewImg" alt="QR preview"></div>
  <div class="actions"><button id="savePng" class="btn btn-primary" type="button">Download PNG</button><button id="saveSvg" class="btn" type="button">Download SVG</button></div>`;
  const buildUrl = (svg = false) => {
    const d = encodeURIComponent($("txt").value.trim());
    const s = $("size").value;
    const fg = $("fg").value.replace("#", "");
    const bg = $("bg").value.replace("#", "");
    if (svg) return `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=${s}x${s}&color=${fg}&bgcolor=${bg}&data=${d}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&color=${fg}&bgcolor=${bg}&data=${d}`;
  };
  const refreshPreview = () => {
    const txt = $("txt").value.trim();
    const img = $("qrPreviewImg");
    const hint = $("qrHint");
    const size = Number($("size").value);
    if (!txt) {
      img.removeAttribute("src");
      img.style.display = "none";
      hint.style.display = "block";
      return;
    }
    img.src = buildUrl(false);
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.display = "block";
    hint.style.display = "none";
  };
  const progressEl = $("toolProgress");
  if (progressEl) progressEl.style.display = "none";
  $("size").addEventListener("input", () => {
    $("sizeVal").textContent = `${$("size").value}px`;
    refreshPreview();
  });
  $("txt").addEventListener("input", refreshPreview);
  $("fg").addEventListener("input", refreshPreview);
  $("bg").addEventListener("input", refreshPreview);
  $("savePng").addEventListener("click", () => {
    const d = $("txt").value.trim();
    if (!d) return showResult("Please enter text or URL.", "error");
    refreshPreview();
    runButton(true);
    fetch(buildUrl(false))
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then((blob) => {
        downloadBlob(blob, "qr.png");
        setProgress(100);
        showResult("QR downloaded as PNG.");
      })
      .catch(() => showResult("PNG download failed. Please try again.", "error"))
      .finally(() => runButton(false));
  });
  $("saveSvg").addEventListener("click", () => {
    const d = $("txt").value.trim();
    if (!d) return showResult("Please enter text or URL.", "error");
    refreshPreview();
    runButton(true);
    fetch(buildUrl(true))
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then((blob) => {
        downloadBlob(blob, "qr.svg");
        setProgress(100);
        showResult("QR downloaded as SVG.");
      })
      .catch(() => showResult("SVG download failed. Please try again.", "error"))
      .finally(() => runButton(false));
  });
  refreshPreview();
}

function toolPassword() {
  const f = $("toolForm");
  f.innerHTML = `
    <label>Password length (4-32)</label>
    <p class="muted">Choose how many characters you want your password to have.</p>
    <input id="len" type="number" min="4" max="32" value="8">
    <label>Keywords (comma separated, optional)</label>
    <input id="kw" placeholder="example: password">
    <div class="option-grid">
      <label class="option-card">
        <input id="l" type="checkbox" checked>
        <span class="option-icon">a</span>
        <span class="option-text"><strong>Lowercase</strong><span>Include a-z</span></span>
      </label>
      <label class="option-card">
        <input id="u" type="checkbox">
        <span class="option-icon">A</span>
        <span class="option-text"><strong>Uppercase</strong><span>Include A-Z</span></span>
      </label>
      <label class="option-card">
        <input id="n" type="checkbox">
        <span class="option-icon">1</span>
        <span class="option-text"><strong>Numbers</strong><span>Include 0-9</span></span>
      </label>
      <label class="option-card">
        <input id="s" type="checkbox">
        <span class="option-icon">#</span>
        <span class="option-text"><strong>Symbols</strong><span>Include !@#$</span></span>
      </label>
    </div>
    <div id="passwordOutputBox" class="password-output-box is-hidden">
      <label for="out">Generated password</label>
      <input id="out" class="password-output-input" readonly>
    </div>
    <div class="actions">
      <button id="runTool" data-label="Generate Password" class="btn btn-primary" type="button">Generate Password</button>
      <button id="copy" class="btn" type="button">Copy</button>
    </div>`;
  $("runTool").addEventListener("click", () => {
    const opts = {
      uppercase: $("u").checked,
      lowercase: $("l").checked,
      numbers: $("n").checked,
      symbols: $("s").checked
    };
    if (!opts.uppercase && !opts.lowercase && !opts.numbers && !opts.symbols) {
      opts.lowercase = true;
    }

    const keywords = ($("kw").value || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
    const len = Math.max(4, Math.min(32, Number($("len").value)));

    let out = "";
    if (keywords.length) {
      out = buildKeywordPassword(keywords, len, opts);
    } else {
      const pools = [];
      if (opts.uppercase) pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (opts.lowercase) pools.push("abcdefghijklmnopqrstuvwxyz");
      if (opts.numbers) pools.push("0123456789");
      if (opts.symbols) pools.push("!@#$%^&*()_+-=[]{}");
      const chars = pools.join("");
      while (out.length < len) out += chars[Math.floor(Math.random() * chars.length)];
      out = shuffleString(out);
    }

    $("out").value = out;
    $("passwordOutputBox").classList.remove("is-hidden");
    setProgress(100);
    showResult(keywords ? "Keyword-based password generated." : "Password generated.");
  });
  $("copy").addEventListener("click", async () => {
    if (!$("out").value) return;
    await navigator.clipboard.writeText($("out").value);
    showResult("Password copied.");
  });
}

function buildKeywordPassword(keywords, len, opts) {
  const normalized = keywords.map((w) => w.replace(/\s+/g, "")).filter(Boolean);
  const symbolList = ["!", "@", "#", "$", "%", "&", "*"];
  const joiner = opts.symbols ? symbolList[Math.floor(Math.random() * symbolList.length)] : "";

  let base = normalized
    .map((w, i) => {
      if (!opts.uppercase && opts.lowercase) return w.toLowerCase();
      if (opts.uppercase && !opts.lowercase) return w.toUpperCase();
      if (Math.random() > 0.5 || i % 2 === 0) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      return w.toLowerCase();
    })
    .join(joiner);

  if (opts.numbers) {
    base += String(Math.floor(10 + Math.random() * 90));
  }

  if (opts.symbols && !joiner) {
    base += symbolList[Math.floor(Math.random() * symbolList.length)];
  }

  // Keep keyword text order fixed; only append variable characters.

  const randomPool = [
    ...(opts.uppercase ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") : []),
    ...(opts.lowercase ? "abcdefghijklmnopqrstuvwxyz".split("") : []),
    ...(opts.numbers ? "0123456789".split("") : []),
    ...(opts.symbols ? "!@#$%^&*_-+=?".split("") : [])
  ];
  const targetLen = len;
  const safeBase = base.slice(0, targetLen);
  const remaining = Math.max(0, targetLen - safeBase.length);

  let filler = "";
  while (filler.length < remaining) {
    filler += randomPool[Math.floor(Math.random() * randomPool.length)] || "a";
  }
  filler = filler.slice(0, remaining);

  const mode = Math.floor(Math.random() * 3); // 0: start, 1: middle, 2: end
  let candidate = "";
  let baseStart = 0;
  let baseEnd = 0;

  if (mode === 0) {
    candidate = (safeBase + filler).slice(0, targetLen);
    baseStart = 0;
    baseEnd = Math.min(safeBase.length, candidate.length);
  } else if (mode === 2) {
    candidate = (filler + safeBase).slice(0, targetLen);
    baseStart = Math.max(0, candidate.length - safeBase.length);
    baseEnd = candidate.length;
  } else {
    const split = Math.floor(Math.random() * (filler.length + 1));
    const prefix = filler.slice(0, split);
    const suffix = filler.slice(split);
    candidate = (prefix + safeBase + suffix).slice(0, targetLen);
    baseStart = prefix.length;
    baseEnd = Math.min(prefix.length + safeBase.length, candidate.length);
  }

  const nonKeywordIndexes = [];
  for (let i = 0; i < candidate.length; i++) {
    if (i < baseStart || i >= baseEnd) nonKeywordIndexes.push(i);
  }

  const chars = candidate.split("");
  const pickNonKeywordIndex = () =>
    nonKeywordIndexes[Math.floor(Math.random() * nonKeywordIndexes.length)];

  if (opts.numbers && !/\d/.test(candidate) && nonKeywordIndexes.length) {
    const idx = pickNonKeywordIndex();
    chars[idx] = String(Math.floor(Math.random() * 10));
  }

  if (opts.symbols && !/[!@#$%^&*_\-+=?]/.test(chars.join("")) && nonKeywordIndexes.length) {
    const idx = pickNonKeywordIndex();
    chars[idx] = "!@#$%^&*_-+=?"[Math.floor(Math.random() * "!@#$%^&*_-+=?".length)];
  }

  return chars.join("");
}

function shuffleString(str) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

function toolWordCounter() {
  const f = $("toolForm");
  f.innerHTML = `<label>Enter text</label><textarea id="txt"></textarea>
  <div class="stats-grid">
    <article class="stat-card"><span class="stat-label"><span class="stat-icon">🔤</span>Words</span><strong id="w" class="stat-value">0 words</strong></article>
    <article class="stat-card"><span class="stat-label"><span class="stat-icon">🔡</span>Characters</span><strong id="c" class="stat-value">0 characters</strong></article>
    <article class="stat-card"><span class="stat-label"><span class="stat-icon">↔️</span>Without spaces</span><strong id="cn" class="stat-value">0 chars</strong></article>
    <article class="stat-card"><span class="stat-label"><span class="stat-icon">📄</span>Paragraphs</span><strong id="p" class="stat-value">0 paragraphs</strong></article>
  </div>`;
  const updateLiveStats = () => {
    const t = $("txt").value;
    const wordCount = (t.trim().match(/\S+/g) || []).length;
    const charCount = t.length;
    const noSpaceCount = t.replace(/\s/g, "").length;
    const paraCount = t.split(/\n+/).filter((x) => x.trim()).length;

    $("w").textContent = `${wordCount} ${wordCount === 1 ? "word" : "words"}`;
    $("c").textContent = `${charCount} ${charCount === 1 ? "character" : "characters"}`;
    $("cn").textContent = `${noSpaceCount} ${noSpaceCount === 1 ? "char" : "chars"}`;
    $("p").textContent = `${paraCount} ${paraCount === 1 ? "paragraph" : "paragraphs"}`;
    setProgress(100);
    showResult("Live analysis active.");
  };
  $("txt").addEventListener("input", updateLiveStats);
  updateLiveStats();
}

function toolImageConverter() {
  const f = $("toolForm");
  f.innerHTML = `
    <div class="format-switch-row">
      <div>
        <label>From</label>
        <select id="fromFmt">
          <option value="jpeg">JPG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      <button id="swapFmt" class="btn" type="button" aria-label="Swap formats">⇄</button>
      <div>
        <label>To</label>
        <select id="toFmt">
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="webp">WebP</option>
          <option value="svg">SVG</option>
        </select>
      </div>
    </div>
    <div id="up"></div>
    <div class="ic-preview-wrap" id="icPreviewWrap" hidden>
      <p class="muted">Preview</p>
      <img id="icPreviewImg" class="ic-preview-img" alt="Selected image preview">
    </div>
    <p class="muted">Tip: Use swap for JPG/PNG direction changes. SVG output is optimized for logos and icons.</p>
    <button id="runTool" data-label="Convert Image" class="btn btn-primary" type="button">Convert Image</button>`;
  const input = initUploader("up", ".jpg,.jpeg,.png,.webp", false);

  const fromEl = $("fromFmt");
  const toEl = $("toFmt");
  const inputEl = $("upInput");
  const previewWrap = $("icPreviewWrap");
  const previewImg = $("icPreviewImg");
  let imageTracerLib = null;
  let imageTracerLoading = null;

  const ensureImageTracer = async () => {
    if (imageTracerLib) return imageTracerLib;
    if (!imageTracerLoading) {
      imageTracerLoading = import("https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/+esm")
        .then((m) => {
          imageTracerLib = m.default || m;
          return imageTracerLib;
        })
        .catch(() => null);
    }
    return imageTracerLoading;
  };

  const syncAccept = () => {
    const from = fromEl.value;
    const acceptMap = {
      jpeg: ".jpg,.jpeg",
      png: ".png",
      webp: ".webp"
    };
    if (inputEl) inputEl.setAttribute("accept", acceptMap[from] || ".jpg,.jpeg,.png,.webp");
    const list = $("upList");
    if (list) list.textContent = "No files selected";
    if (previewWrap) previewWrap.hidden = true;
    if (previewImg) previewImg.removeAttribute("src");
  };

  const renderPreview = (file) => {
    if (!previewWrap || !previewImg) return;
    if (!file) {
      previewWrap.hidden = true;
      previewImg.removeAttribute("src");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    previewImg.onload = () => URL.revokeObjectURL(objectUrl);
    previewImg.src = objectUrl;
    previewWrap.hidden = false;
  };

  const ensureDifferentFormats = () => {
    if (fromEl.value === toEl.value) {
      const fallback = fromEl.value === "jpeg" ? "png" : "jpeg";
      toEl.value = fallback;
    }
  };

  fromEl.addEventListener("change", () => {
    ensureDifferentFormats();
    syncAccept();
  });
  toEl.addEventListener("change", ensureDifferentFormats);
  $("swapFmt").addEventListener("click", () => {
    const prevFrom = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = prevFrom;
    syncAccept();
  });
  inputEl?.addEventListener("change", () => {
    const file = input.files?.[0] || null;
    renderPreview(file);
  });

  ensureDifferentFormats();
  syncAccept();

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const from = fromEl.value;
      const to = toEl.value;
      const allowedByFrom = {
        jpeg: ["jpg", "jpeg"],
        png: ["png"],
        webp: ["webp"]
      };
      const err = validateFiles(file ? [file] : [], allowedByFrom[from] || ["jpg", "jpeg", "png", "webp"]);
      if (err) return showResult(err, "error");
      const c = await imgToCanvas(file);
      const mimeMap = {
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp"
      };
      if (to === "svg") {
        const ImageTracer = await ensureImageTracer();
        if (!ImageTracer) return showResult("SVG conversion library could not be loaded. Please try again.", "error");
        const traceCanvas = document.createElement("canvas");
        traceCanvas.width = c.width;
        traceCanvas.height = c.height;
        const tctx = traceCanvas.getContext("2d");
        tctx.drawImage(c, 0, 0);
        const imgd = tctx.getImageData(0, 0, traceCanvas.width, traceCanvas.height);
        // Multi-color trace profile for logos/icons (keeps more colors than strict monochrome).
        const svgText = ImageTracer.imagedataToSVG(imgd, {
          ltres: 1,
          qtres: 1,
          pathomit: 8,
          rightangleenhance: true,
          colorsampling: 2,
          numberofcolors: 32,
          mincolorratio: 0.01,
          colorquantcycles: 3,
          strokewidth: 0,
          linefilter: true,
          scale: 1
        });
        const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        setProgress(100);
        downloadBlob(svgBlob, `converted-${from}-to-svg.svg`);
        showResult(`Converted: ${from.toUpperCase()} -> SVG`);
        return;
      }
      const targetMime = mimeMap[to] || "image/png";
      const quality = targetMime === "image/png" ? undefined : 0.92;
      const blob = await new Promise((res) => c.toBlob(res, targetMime, quality));
      const ext = to === "jpeg" ? "jpg" : to;
      setProgress(100);
      downloadBlob(blob, `converted-${from}-to-${to}.${ext}`);
      showResult(`Converted: ${from.toUpperCase()} -> ${to.toUpperCase()}`);
    } catch {
      showResult("Conversion failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolPdfRotate() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div id="rotateControls" class="rotate-controls" hidden>
    <div class="row">
      <div id="rotateScopeWrap">
        <label for="rotateScope">Rotate scope</label>
        <select id="rotateScope">
          <option value="all">All pages</option>
          <option value="selected">Selected pages</option>
        </select>
      </div>
      <div id="rotatePagesWrap" hidden>
        <label for="rotatePages">Pages (example: 2 or 1,3)</label>
        <input id="rotatePages" type="text" placeholder="2 or 1,3">
      </div>
    </div>
    <label for="degSlider">Rotate angle</label>
    <div id="rotateSliderShell" class="rotate-slider-shell">
      <div class="rotate-track" aria-hidden="true">
        <span class="rotate-track-fill"></span>
        <span class="rotate-track-start-dot"></span>
        <span class="rotate-track-dot"></span>
      </div>
      <input id="degSlider" type="range" min="0" max="3" step="1" value="0">
      <div class="rotate-marks" aria-hidden="true">
        <button type="button" class="rotate-mark-btn" data-idx="0">0°</button>
        <button type="button" class="rotate-mark-btn" data-idx="1">90°</button>
        <button type="button" class="rotate-mark-btn" data-idx="2">180°</button>
        <button type="button" class="rotate-mark-btn" data-idx="3">270°</button>
      </div>
    </div>
    <div class="rotate-meta"><span>Angle</span><strong id="degOut">0°</strong></div>
  </div>
  <div id="rotatePreviewWrap" class="rotate-preview-wrap" hidden>
    <div class="row">
      <div>
        <label for="rotatePreviewPage">Preview page</label>
        <select id="rotatePreviewPage"></select>
      </div>
    </div>
    <p class="muted">Preview (first page)</p>
    <div class="rotate-preview-stage">
      <canvas id="rotatePreviewCanvas" class="rotate-preview-canvas"></canvas>
    </div>
  </div>
  <button id="runTool" data-label="Download" class="btn btn-primary" type="button">Download</button>`;
  const input = initUploader("up", ".pdf", false);
  let sourceBytes = null;
  let previewUrlToken = 0;
  let currentDeg = 0;
  let lastRotateIdx = 0;
  let totalPages = 0;
  let previewPdfDoc = null;
  const rotateSteps = [0, 90, 180, 270];
  const rotateTrack = f.querySelector(".rotate-track");
  const rotateDot = f.querySelector(".rotate-track-dot");
  let isDraggingRotateDot = false;
  const getIdxFromClientX = (clientX) => {
    const rect = rotateTrack.getBoundingClientRect();
    if (!rect.width) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (rotateSteps.length - 1));
  };
  const updateRotateUi = (idx, animate = true) => {
    const safeIdx = Math.max(0, Math.min(rotateSteps.length - 1, Number(idx) || 0));
    const distance = Math.abs(safeIdx - lastRotateIdx);
    const durationSec = animate ? (distance * 1.5) : 0;
    f.style.setProperty("--rot-dur", `${durationSec}s`);
    $("degSlider").value = String(safeIdx);
    currentDeg = rotateSteps[safeIdx] ?? 0;
    previewCanvas.style.transform = `rotate(${currentDeg}deg)`;
    $("degOut").textContent = `${currentDeg}°`;
    const pct = Math.round((safeIdx / (rotateSteps.length - 1)) * 100);
    const pctText = `${pct}%`;
    $("rotateSliderShell").style.setProperty("--rot-fill", pctText);
    $("rotateSliderShell").style.setProperty("--rot-pos", pctText);
    document.querySelectorAll(".rotate-mark-btn").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.idx) === safeIdx);
    });
    lastRotateIdx = safeIdx;
  };

  const parseSelectedPages = () =>
    (($("rotatePages").value || "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= totalPages));

  const renderPreviewPage = async (pageNum) => {
    if (!previewPdfDoc || !totalPages) return;
    const safePage = Math.max(1, Math.min(totalPages, Number(pageNum) || 1));
    const page = await previewPdfDoc.getPage(safePage);
    const viewport = page.getViewport({ scale: 1.1 });
    previewCanvas.width = viewport.width;
    previewCanvas.height = viewport.height;
    await page.render({ canvasContext: previewCanvas.getContext("2d"), viewport }).promise;
    updatePreviewRotation();
  };

  const syncPreviewWithSelectedPages = async () => {
    if ($("rotateScope").value !== "selected") return;
    const selected = parseSelectedPages();
    if (!selected.length) return;
    const first = selected[0];
    const previewSelect = $("rotatePreviewPage");
    if (String(first) !== previewSelect.value) {
      previewSelect.value = String(first);
      await renderPreviewPage(first);
    }
  };

  const previewCanvas = $("rotatePreviewCanvas");
  const updatePreviewRotation = () => {
    const idx = Number($("degSlider").value) || 0;
    updateRotateUi(idx);
  };

  const renderPreview = async (file) => {
    if (!file) return;
    const thisToken = ++previewUrlToken;
    const rawBytes = await file.arrayBuffer();
    sourceBytes = rawBytes.slice(0);
    const previewBytes = rawBytes.slice(0);
    $("degSlider").value = "0";
    lastRotateIdx = 0;
    updateRotateUi(0, false);
    previewPdfDoc = await pdfjsLib.getDocument({ data: previewBytes }).promise;
    totalPages = previewPdfDoc.numPages || 0;
    if (thisToken !== previewUrlToken) return;
    const previewSelect = $("rotatePreviewPage");
    previewSelect.innerHTML = Array.from({ length: totalPages }, (_, i) => `<option value="${i + 1}">Page ${i + 1}</option>`).join("");
    previewSelect.value = "1";
    const isSinglePage = totalPages <= 1;
    $("rotateScope").value = "all";
    $("rotateScopeWrap").hidden = isSinglePage;
    $("rotatePagesWrap").hidden = true;
    await renderPreviewPage(1);
    if (thisToken !== previewUrlToken) return;
    $("rotateControls").hidden = false;
    $("rotatePreviewWrap").hidden = false;
  };

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["pdf"]);
    if (err) {
      $("rotateControls").hidden = true;
      $("rotatePreviewWrap").hidden = true;
      showResult(err, "error");
      return;
    }
    try {
      await renderPreview(file);
      showResult("Preview ready. Drag the angle slider and rotate.");
    } catch {
      $("rotateControls").hidden = true;
      $("rotatePreviewWrap").hidden = true;
      showResult("Preview could not be generated.", "error");
    }
  });

  $("degSlider").addEventListener("input", () => {
    const idx = Number($("degSlider").value) || 0;
    updateRotateUi(idx);
  });
  $("rotateScope").addEventListener("change", () => {
    const isSinglePage = totalPages <= 1;
    $("rotatePagesWrap").hidden = isSinglePage || $("rotateScope").value !== "selected";
    syncPreviewWithSelectedPages().catch(() => {});
  });
  $("rotatePages").addEventListener("input", () => {
    syncPreviewWithSelectedPages().catch(() => {});
  });
  $("rotatePreviewPage").addEventListener("change", () => {
    const pageNum = Number($("rotatePreviewPage").value) || 1;
    if (totalPages > 1) {
      $("rotateScope").value = "selected";
      $("rotatePagesWrap").hidden = false;
      $("rotatePages").value = String(pageNum);
    }
    renderPreviewPage(pageNum).catch(() => {});
  });
  const onPointerMove = (e) => {
    if (!isDraggingRotateDot) return;
    updateRotateUi(getIdxFromClientX(e.clientX));
  };
  const stopDragging = () => {
    if (!isDraggingRotateDot) return;
    isDraggingRotateDot = false;
    rotateTrack.classList.remove("dragging");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  };
  const startDragging = (e) => {
    e.preventDefault();
    isDraggingRotateDot = true;
    rotateTrack.classList.add("dragging");
    updateRotateUi(getIdxFromClientX(e.clientX));
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  };
  rotateDot.addEventListener("pointerdown", startDragging);
  rotateTrack.addEventListener("pointerdown", (e) => {
    // allow easy clicking or dragging on the whole bar area
    startDragging(e);
  });
  document.querySelectorAll(".rotate-mark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx) || 0;
      updateRotateUi(idx);
    });
  });
  updateRotateUi(0, false);

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      let bytes = sourceBytes;
      if (!bytes || !bytes.byteLength) bytes = await file.arrayBuffer();
      const pdf = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const deg = currentDeg;
      const pages = pdf.getPages();
      const scope = $("rotateScope").value;
      let selected = null;
      if (scope === "selected") {
        const raw = ($("rotatePages").value || "").trim();
        // If user did not type page numbers, use the currently previewed page.
        if (!raw) {
          const previewPage = Number($("rotatePreviewPage").value) || 1;
          $("rotatePages").value = String(previewPage);
        }
        selected = new Set(parseSelectedPages().map((n) => n - 1));
        if (!selected.size) return showResult("No valid pages selected.", "error");
      }
      pages.forEach((p, idx) => {
        if (selected && !selected.has(idx)) return;
        const current = p.getRotation()?.angle || 0;
        const next = ((current + deg) % 360 + 360) % 360;
        p.setRotation(window.PDFLib.degrees(next));
      });
      downloadBlob(new Blob([await pdf.save()]), "rotated.pdf");
      setProgress(100);
      if (selected) {
        showResult(`Rotated selected pages: ${Array.from(selected).map((i) => i + 1).join(", ")}.`);
      } else {
        showResult("Rotated PDF downloaded.");
      }
    } catch {
      showResult("PDF rotate failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolPdfDeletePages() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div id="deleteThumbWrap" class="split-thumb-wrap" hidden>
    <p class="muted">Click pages to delete</p>
    <div id="deleteThumbGrid" class="split-thumb-grid"></div>
    <p id="deleteSelectedInfo" class="muted">Pages to delete: -</p>
  </div>
  <button id="runTool" data-label="Delete Pages" class="btn btn-primary" type="button">Delete Pages</button>`;
  const input = initUploader("up", ".pdf", false);
  let sourceBytes = null;
  let pageCount = 0;
  let selectedPages = new Set();

  const updateSelectedInfo = () => {
    const selected = Array.from(selectedPages).sort((a, b) => a - b);
    $("deleteSelectedInfo").textContent = selected.length ? `Pages to delete: ${selected.join(", ")}` : "Pages to delete: -";
  };

  const renderDeleteThumbs = async () => {
    if (!sourceBytes) return;
    const grid = $("deleteThumbGrid");
    grid.innerHTML = "";
    selectedPages = new Set();
    updateSelectedInfo();
    const pdf = await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
    pageCount = pdf.numPages || 0;
    $("deleteThumbWrap").hidden = false;
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "split-thumb-card";
      card.innerHTML = `<span class="split-thumb-no">${p}</span>`;
      const img = document.createElement("img");
      img.className = "split-thumb-img";
      img.alt = `Page ${p}`;
      img.src = canvas.toDataURL("image/jpeg", 0.88);
      card.appendChild(img);
      card.addEventListener("click", () => {
        if (selectedPages.has(p)) selectedPages.delete(p);
        else selectedPages.add(p);
        card.classList.toggle("selected", selectedPages.has(p));
        updateSelectedInfo();
      });
      grid.appendChild(card);
    }
  };

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["pdf"]);
    if (err) return showResult(err, "error");
    sourceBytes = await file.arrayBuffer();
    await renderDeleteThumbs();
    showResult("Pages loaded. Select pages to delete.");
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const pdf = await window.PDFLib.PDFDocument.load(sourceBytes || await file.arrayBuffer(), { ignoreEncryption: true });
      const ids = Array.from(selectedPages).map((n) => n - 1).filter((n) => n >= 0).sort((a, b) => b - a);
      if (!ids.length) return showResult("Please select at least one page to delete.", "error");
      if (ids.length >= pageCount) return showResult("At least one page must remain in the PDF.", "error");
      ids.forEach((idx) => {
        if (idx < pdf.getPageCount()) pdf.removePage(idx);
      });
      downloadBlob(new Blob([await pdf.save()]), "pages-deleted.pdf");
      setProgress(100);
      showResult("PDF pages deleted.");
    } catch {
      showResult("Page delete failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolPdfWatermark() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div class="wm-layout">
    <aside class="wm-sidebar" aria-label="Watermark settings">
      <label>Watermark text</label>
      <input id="wm" placeholder="Type watermark text (optional)">
      <div class="row wm-sidebar-controls">
        <div>
          <label>Font size: <span id="wmSizeOut">32</span></label>
          <input id="wmSize" type="range" min="10" max="155" step="1" value="32">
        </div>
        <div>
          <label>Opacity: <span id="wmOpacityOut">0.25</span></label>
          <input id="wmOpacity" type="range" min="0.05" max="1" step="0.05" value="0.25">
        </div>
        <div>
          <label>Rotation: <span id="wmRotateOut">0°</span></label>
          <input id="wmRotate" type="range" min="-90" max="90" step="1" value="0">
        </div>
      </div>
      <div class="row wm-sidebar-controls">
        <div>
          <label>Position</label>
          <select id="wmPos">
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>
        <div>
          <label>Apply watermark</label>
          <select id="wmScope">
            <option value="all">All pages</option>
            <option value="first">Only first page</option>
            <option value="selected">Selected pages</option>
          </select>
        </div>
        <div>
          <label>Logo size: <span id="wmLogoSizeOut">72</span>px</label>
          <input id="wmLogoSize" type="range" min="24" max="220" step="1" value="72">
        </div>
      </div>
      <div id="wmSelectedPagesWrap" hidden>
        <label>Selected pages (example: 2,4,7 or 1-3,8)</label>
        <input id="wmSelectedPages" type="text" placeholder="2,4,7 or 1-3,8">
      </div>
      <div class="wm-logo-block" id="wmLogoDropZone" aria-label="Logo image upload area">
        <div class="wm-logo-head">
          <h3 class="wm-logo-title">Add your logo to the PDF <span class="wm-logo-badge">Optional</span></h3>
          <p class="wm-logo-lead">Your logo appears on the pages you watermark. Drag an image here or click the box below to choose a file.</p>
        </div>
        <label for="wmLogo" class="logo-upload-btn">
          <span class="logo-upload-icon-wrap" aria-hidden="true"><span class="logo-upload-icon">🖼️</span></span>
          <span class="logo-upload-text">Drop logo here or click to upload</span>
          <span class="logo-upload-sub">PNG, JPG, WebP, SVG, GIF, BMP</span>
        </label>
        <input id="wmLogo" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp" hidden>
        <div class="wm-logo-footer">
          <p id="wmLogoName" class="wm-logo-status">No logo selected yet — use the area above.</p>
          <button id="wmLogoRemove" class="btn wm-logo-remove" type="button" hidden>Remove logo</button>
        </div>
      </div>
      <button id="runTool" data-label="Add Watermark" class="btn btn-primary" type="button">Add Watermark</button>
    </aside>
    <div class="wm-main">
      <div class="wm-preview-heading">
        <h3 class="wm-preview-label">Preview</h3>
        <p class="wm-preview-hint muted">Updates as you change settings. Upload a PDF above to see your page.</p>
      </div>
      <div id="wmPreview" class="watermark-preview wm-preview-panel">
        <canvas id="wmPreviewCanvas" class="wm-preview-canvas"></canvas>
        <span id="wmPreviewText" class="wm-preview-text"></span>
        <img id="wmPreviewLogo" class="wm-preview-logo" alt="" />
      </div>
    </div>
  </div>`;
  const input = initUploader("up", ".pdf", false);
  let logoBytes = null;
  let logoMime = "image/png";
  let wmSourceBytes = null;
  let wmPreviewToken = 0;
  

  const parsePageSpec = (raw, totalPages) => {
    const out = new Set();
    (raw || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (part.includes("-")) {
          const [aRaw, bRaw] = part.split("-");
          const a = Number((aRaw || "").trim());
          const b = Number((bRaw || "").trim());
          if (!Number.isInteger(a) || !Number.isInteger(b)) return;
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(totalPages, Math.max(a, b));
          for (let p = start; p <= end; p++) out.add(p);
        } else {
          const n = Number(part);
          if (Number.isInteger(n) && n >= 1 && n <= totalPages) out.add(n);
        }
      });
    return out;
  };

  const readFileAsPngBytes = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
          resolve(await blob.arrayBuffer());
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unsupported logo format"));
      };
      img.src = url;
    });

  const renderPdfPreview = async () => {
    if (!wmSourceBytes) return;
    const token = ++wmPreviewToken;
    const pdf = await pdfjsLib.getDocument({ data: wmSourceBytes.slice(0) }).promise;
    const page = await pdf.getPage(1);
    if (token !== wmPreviewToken) return;
    const viewport = page.getViewport({ scale: 1 });
    const canvas = $("wmPreviewCanvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  };

  const getCurrentWatermarkSettings = () => ({
    text: $("wm").value.trim(),
    size: Math.max(10, Number($("wmSize").value) || 32),
    opacity: Math.min(1, Math.max(0.05, Number($("wmOpacity").value) || 0.25)),
    rotate: Number($("wmRotate").value) || 0,
    pos: $("wmPos").value,
    scope: $("wmScope").value,
    logoSize: Math.max(24, Number($("wmLogoSize").value) || 72)
  });

  const applyLiveOverlay = () => {
    const s = getCurrentWatermarkSettings();
    const preview = $("wmPreview");
    const canvas = $("wmPreviewCanvas");
    const pText = $("wmPreviewText");
    const pLogo = $("wmPreviewLogo");
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const pageW = Math.max(1, canvas.width || 1);
    const pageH = Math.max(1, canvas.height || 1);
    const boxW = Math.max(1, canvas.clientWidth || preview.clientWidth || pageW);
    const boxH = Math.max(1, canvas.clientHeight || preview.clientHeight || pageH);
    const boxOffsetX = canvas.offsetLeft || 0;
    const boxOffsetY = canvas.offsetTop || 0;
    const scaleX = boxW / pageW;
    const scaleY = boxH / pageH;

    // Keep anchors in PDF coordinate system (origin: bottom-left),
    // then map to CSS coordinates for preview.
    const anchorRectPdf = (w, h) => {
      let x = (pageW - w) / 2;
      let y = (pageH - h) / 2;
      if (s.pos === "top-left") {
        x = 24; y = pageH - 24 - h;
      } else if (s.pos === "top-right") {
        x = pageW - 24 - w; y = pageH - 24 - h;
      } else if (s.pos === "bottom-left") {
        x = 24; y = 24;
      } else if (s.pos === "bottom-right") {
        x = pageW - 24 - w; y = 24;
      }
      return {
        x: clamp(x, 0, Math.max(0, pageW - w)),
        y: clamp(y, 0, Math.max(0, pageH - h))
      };
    };

    pText.textContent = s.text;
    pText.style.display = s.text ? "block" : "none";
    pText.style.fontSize = `${Math.max(8, s.size * scaleY)}px`;
    pText.style.fontFamily = "Helvetica, Arial, sans-serif";
    pText.style.fontWeight = "700";
    pText.style.opacity = String(s.opacity);
    pText.style.transformOrigin = "left bottom";

    let textRect = null;
    if (s.text) {
      const textW = Math.max(1, (pText.offsetWidth || 1) / Math.max(0.0001, scaleX));
      const textH = s.size;
      textRect = anchorRectPdf(textW, textH);
      const left = boxOffsetX + (textRect.x * scaleX);
      const top = boxOffsetY + ((pageH - textRect.y - textH) * scaleY);
      pText.style.left = `${left}px`;
      pText.style.top = `${top}px`;
      pText.style.transform = `rotate(${-s.rotate}deg)`;
    }

    const logoRatio = pLogo.naturalWidth && pLogo.naturalHeight
      ? (pLogo.naturalHeight / pLogo.naturalWidth)
      : 1;
    const logoW = s.logoSize;
    const logoH = logoW * logoRatio;
    const logoBase = anchorRectPdf(logoW, logoH);
    const logoX = textRect ? textRect.x : logoBase.x;
    const isBottomPos = s.pos.startsWith("bottom");
    const logoYRaw = textRect ? (isBottomPos ? textRect.y - (logoH + 8) : textRect.y + s.size + 8) : logoBase.y;
    const logoY = clamp(logoYRaw, 0, Math.max(0, pageH - logoH));
    const clampedLogoX = clamp(logoX, 0, Math.max(0, pageW - logoW));
    const logoLeft = boxOffsetX + (clampedLogoX * scaleX);
    const logoTop = boxOffsetY + ((pageH - logoY - logoH) * scaleY);
    pLogo.style.width = `${logoW * scaleX}px`;
    pLogo.style.height = `${logoH * scaleY}px`;
    pLogo.style.opacity = String(Math.min(1, s.opacity + 0.1));
    pLogo.style.left = `${logoLeft}px`;
    pLogo.style.top = `${logoTop}px`;
    pLogo.style.transformOrigin = "left bottom";
    pLogo.style.transform = `rotate(${-s.rotate}deg)`;
    pLogo.style.display = (logoBytes && pLogo.src) ? "block" : "none";
  };

  const renderExactWatermarkPreview = async () => {
    if (!wmSourceBytes) return;
    const token = ++wmPreviewToken;
    const s = getCurrentWatermarkSettings();
    const workPdf = await window.PDFLib.PDFDocument.load(wmSourceBytes.slice(0), { ignoreEncryption: true });
    const font = await workPdf.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    let logoImage = null;
    if (logoBytes) logoImage = await workPdf.embedPng(logoBytes);
    const pages = workPdf.getPages();
    let selectedPreviewSet = null;
    if (s.scope === "selected") {
      selectedPreviewSet = parsePageSpec($("wmSelectedPages").value, pages.length);
    }
    pages.forEach((page, idx) => {
      if (s.scope === "first" && idx > 0) return;
      if (s.scope === "selected" && selectedPreviewSet && !selectedPreviewSet.has(idx + 1)) return;
      const isBottomPos = s.pos.startsWith("bottom");
      const pageW = page.getWidth();
      const pageH = page.getHeight();
      let textRect = null;
      if (s.text) {
        const textW = font.widthOfTextAtSize(s.text, s.size);
        const textH = s.size;
        textRect = getAnchoredRect(page, s.pos, textW, textH);
        page.drawText(s.text, {
          x: textRect.x,
          y: textRect.y,
          size: s.size,
          rotate: window.PDFLib.degrees(s.rotate),
          opacity: s.opacity,
          font,
          color: window.PDFLib.rgb(0.5, 0.5, 0.5)
        });
      }
      if (logoImage) {
        const ratio = logoImage.height / logoImage.width || 1;
        const logoHeight = s.logoSize * ratio;
        const logoBase = getAnchoredRect(page, s.pos, s.logoSize, logoHeight);
        const logoX = textRect ? textRect.x : logoBase.x;
        // Keep PDF output placement aligned with live preview semantics:
        // top positions => logo goes above text, bottom positions => below text.
        const logoYRaw = textRect
          ? (isBottomPos ? textRect.y - (logoHeight + 8) : textRect.y + s.size + 8)
          : logoBase.y;
        const logoY = clamp(logoYRaw, 0, Math.max(0, pageH - logoHeight));
        const clampedX = clamp(logoX, 0, Math.max(0, pageW - s.logoSize));
        page.drawImage(logoImage, {
          x: clampedX,
          y: logoY,
          width: s.logoSize,
          height: logoHeight,
          opacity: Math.min(1, s.opacity + 0.1),
          rotate: window.PDFLib.degrees(s.rotate)
        });
      }
    });
    const previewBytes = await workPdf.save();
    const pdf = await pdfjsLib.getDocument({ data: previewBytes }).promise;
    const page = await pdf.getPage(1);
    if (token !== wmPreviewToken) return;
    const viewport = page.getViewport({ scale: 1 });
    const canvas = $("wmPreviewCanvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  };

  const updateWmLabelsAndUi = () => {
    const s = getCurrentWatermarkSettings();
    $("wmSizeOut").textContent = String(s.size);
    $("wmOpacityOut").textContent = s.opacity.toFixed(2);
    $("wmRotateOut").textContent = `${s.rotate}°`;
    $("wmLogoSizeOut").textContent = String(s.logoSize);
    $("wmSelectedPagesWrap").hidden = s.scope !== "selected";
  };

  const applyPreview = () => {
    updateWmLabelsAndUi();
    applyLiveOverlay();
  };

  ["wm", "wmPos", "wmScope", "wmSelectedPages"].forEach((id) => {
    if (!$(id)) return;
    $(id).addEventListener("input", applyPreview);
    $(id).addEventListener("change", applyPreview);
  });
  ["wmSize", "wmOpacity", "wmRotate", "wmLogoSize"].forEach((id) => {
    $(id).addEventListener("input", () => {
      updateWmLabelsAndUi();
      applyLiveOverlay();
    });
    $(id).addEventListener("change", applyPreview);
  });
  $("wmScope").addEventListener("change", () => {
    $("wmSelectedPagesWrap").hidden = $("wmScope").value !== "selected";
  });
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const err = validateFiles([file], ["pdf"]);
    if (err) return showResult(err, "error");
    wmSourceBytes = await file.arrayBuffer();
    await renderPdfPreview(wmSourceBytes);
    applyPreview();
  });
  const applyLogoFromFile = async (file) => {
    if (!file) {
      logoBytes = null;
      logoMime = "image/png";
      $("wmPreviewLogo").src = "";
      $("wmLogoName").textContent = "No logo selected yet — use the area above.";
      $("wmLogoRemove").hidden = true;
      applyPreview();
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"].includes(ext)) {
      showResult("Logo format unsupported.", "error");
      return;
    }
    try {
      logoBytes = await readFileAsPngBytes(file);
      logoMime = "image/png";
      const statusEl = $("wmLogoName");
      statusEl.replaceChildren();
      const readyLbl = document.createElement("strong");
      readyLbl.textContent = "Logo ready: ";
      statusEl.appendChild(readyLbl);
      statusEl.appendChild(document.createTextNode(file.name));
      $("wmLogoRemove").hidden = false;
    } catch {
      showResult("Could not read selected logo file.", "error");
      return;
    }
    $("wmPreviewLogo").onload = () => applyLiveOverlay();
    $("wmPreviewLogo").src = URL.createObjectURL(file);
    applyPreview();
  };

  $("wmLogo").addEventListener("change", async (e) => {
    await applyLogoFromFile(e.target.files[0]);
  });

  const logoDrop = $("wmLogoDropZone");
  if (logoDrop) {
    logoDrop.addEventListener("dragenter", (e) => {
      e.preventDefault();
      logoDrop.classList.add("is-dragover");
    });
    logoDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      logoDrop.classList.add("is-dragover");
    });
    logoDrop.addEventListener("dragleave", (e) => {
      const to = e.relatedTarget;
      if (!to || !logoDrop.contains(to)) logoDrop.classList.remove("is-dragover");
    });
    logoDrop.addEventListener("drop", async (e) => {
      e.preventDefault();
      logoDrop.classList.remove("is-dragover");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const dt = new DataTransfer();
      dt.items.add(f);
      $("wmLogo").files = dt.files;
      await applyLogoFromFile(f);
    });
  }

  $("wmLogoRemove").addEventListener("click", () => {
    logoBytes = null;
    logoMime = "image/png";
    $("wmLogo").value = "";
    $("wmPreviewLogo").src = "";
    $("wmLogoName").textContent = "No logo selected yet — use the area above.";
    $("wmLogoRemove").hidden = true;
    applyPreview();
    showResult("Logo removed.");
  });
  applyPreview();

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const getAnchoredRect = (page, pos, boxW, boxH) => {
    const w = page.getWidth();
    const h = page.getHeight();
    const marginX = 24;
    const marginY = 24;
    let x = (w - boxW) / 2;
    let y = (h - boxH) / 2;
    if (pos === "top-left") {
      x = marginX;
      y = h - marginY - boxH;
    } else if (pos === "top-right") {
      x = w - marginX - boxW;
      y = h - marginY - boxH;
    } else if (pos === "bottom-left") {
      x = marginX;
      y = marginY;
    } else if (pos === "bottom-right") {
      x = w - marginX - boxW;
      y = marginY;
    }
    return {
      x: clamp(x, 0, Math.max(0, w - boxW)),
      y: clamp(y, 0, Math.max(0, h - boxH))
    };
  };

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files[0];
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const pdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const font = await pdf.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      const text = $("wm").value.trim();
      const size = Math.max(10, Number($("wmSize").value) || 32);
      const opacity = Math.min(1, Math.max(0.05, Number($("wmOpacity").value) || 0.25));
      const rotate = Number($("wmRotate").value) || 0;
      const pos = $("wmPos").value;
      const scope = $("wmScope").value;
      const logoSize = Math.max(24, Number($("wmLogoSize").value) || 72);
      if (!text && !logoBytes) {
        return showResult("Please enter watermark text or upload a logo.", "error");
      }

      let logoImage = null;
      if (logoBytes) {
        logoImage = await pdf.embedPng(logoBytes);
      }
      const pages = pdf.getPages();
      let selectedPageSet = null;
      if (scope === "selected") {
        const picked = parsePageSpec($("wmSelectedPages").value, pages.length);
        if (!picked.size) return showResult("Please enter valid page numbers for selected pages.", "error");
        selectedPageSet = picked;
      }
      pages.forEach((page, idx) => {
        if (scope === "first" && idx > 0) return;
        if (scope === "selected" && selectedPageSet && !selectedPageSet.has(idx + 1)) return;
        const isBottomPos = pos.startsWith("bottom");
        const pageW = page.getWidth();
        const pageH = page.getHeight();
        let textRect = null;
        if (text) {
          const textW = font.widthOfTextAtSize(text, size);
          const textH = size;
          textRect = getAnchoredRect(page, pos, textW, textH);
          page.drawText(text, {
            x: textRect.x,
            y: textRect.y,
            size,
            rotate: window.PDFLib.degrees(rotate),
            opacity,
            font,
            color: window.PDFLib.rgb(0.5, 0.5, 0.5)
          });
        }
        if (logoImage) {
          const ratio = logoImage.height / logoImage.width || 1;
          const logoHeight = logoSize * ratio;
          const logoBase = getAnchoredRect(page, pos, logoSize, logoHeight);
          const logoX = textRect ? textRect.x : logoBase.x;
          // Match live preview semantics exactly with PDF coordinate system.
          const logoYRaw = textRect
            ? (isBottomPos ? textRect.y - (logoHeight + 8) : textRect.y + size + 8)
            : logoBase.y;
          const logoY = clamp(logoYRaw, 0, Math.max(0, pageH - logoHeight));
          const clampedX = clamp(logoX, 0, Math.max(0, pageW - logoSize));
          page.drawImage(logoImage, {
            x: clampedX,
            y: logoY,
            width: logoSize,
            height: logoHeight,
            opacity: Math.min(1, opacity + 0.1),
            rotate: window.PDFLib.degrees(rotate)
          });
        }
      });
      downloadBlob(new Blob([await pdf.save()]), "watermarked.pdf");
      setProgress(100);
      showResult("Watermark added.");
    } catch {
      showResult("Watermark failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolPdfToJpg() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div id="ptjPreview" class="merge-preview-grid"></div>
  <button id="runTool" data-label="Convert to JPG" class="btn btn-primary" type="button">Convert to JPG</button>`;
  const input = initUploader("up", ".pdf", false);
  let selectedPdfFile = null;

  /** Fixed export scale: longer page edge up to ~2000px for readable JPGs. */
  const scaleForPage = async (page) => {
    const base = page.getViewport({ scale: 1 });
    const targetMaxPx = 2000;
    const longer = Math.max(base.width, base.height);
    return Math.min(3, Math.max(1.25, targetMaxPx / Math.max(1, longer)));
  };

  const renderPtjPreview = async (file) => {
    const root = $("ptjPreview");
    root.innerHTML = "";
    if (!file) return;
    const targetWidth = 120;
    const dpr = window.devicePixelRatio || 1;
    const item = document.createElement("article");
    item.className = "merge-preview-card";
    item.innerHTML = `<span class="jpg-order-badge">1</span><div class="merge-preview-pages loading">Loading pages...</div><div class="merge-preview-meta"><strong>#1 ${file.name}</strong><span class="muted">Reading pages...</span></div>`;
    root.appendChild(item);
    try {
      const bytes = await file.arrayBuffer();
      const src = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageCount = src.getPageCount();
      item.querySelector(".merge-preview-meta .muted").textContent = `${pageCount} pages`;

      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      const pagesWrap = item.querySelector(".merge-preview-pages");
      pagesWrap.classList.remove("loading");
      pagesWrap.innerHTML = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const baseViewport = page.getViewport({ scale: 1 });
        const baseScale = Math.max(0.6, targetWidth / Math.max(1, baseViewport.width));
        const viewport = page.getViewport({ scale: baseScale * dpr });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        const img = document.createElement("img");
        img.className = "merge-preview-img";
        img.alt = `${file.name} page ${p}`;
        img.src = canvas.toDataURL("image/png");
        const thumb = document.createElement("div");
        thumb.className = "merge-page-thumb";
        thumb.innerHTML = `<span class="merge-page-no">${p}</span>`;
        thumb.appendChild(img);
        pagesWrap.appendChild(thumb);
      }
    } catch {
      const pagesWrap = item.querySelector(".merge-preview-pages");
      pagesWrap.classList.remove("loading");
      pagesWrap.textContent = "Could not render pages";
      item.querySelector(".merge-preview-meta .muted").textContent = "Could not read this PDF";
    }
  };

  input.addEventListener("change", async () => {
    selectedPdfFile = (input.files && input.files[0]) || null;
    await renderPtjPreview(selectedPdfFile);
  });

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = selectedPdfFile || (input.files && input.files[0]);
      const err = validateFiles(file ? [file] : [], ["pdf"]);
      if (err) return showResult(err, "error");
      const jpegQ = 0.92;
      let globalPage = 0;
      const buffer = await file.arrayBuffer();
      const pdfForCount = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      const total = pdfForCount.numPages;
      pdfForCount.destroy();
      let done = 0;
      const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        globalPage += 1;
        const page = await pdf.getPage(i);
        const scale = await scaleForPage(page);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", jpegQ));
        downloadBlob(blob, `page-${String(globalPage).padStart(3, "0")}.jpg`);
        done += 1;
        setProgress(Math.round((done / total) * 100));
      }
      pdf.destroy();
      showResult("PDF pages exported as JPG.");
    } catch {
      showResult("PDF to JPG failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolWordToPdf() {
  const f = $("toolForm");
  f.innerHTML = `<div id="up"></div>
  <div id="wtpPreview" class="compress-file-card" hidden>
    <strong id="wtpFileName"></strong>
    <span class="muted">Size: <span id="wtpFileSize"></span></span>
    <span class="muted"><span id="wtpCountLabel">Pictures:</span> <span id="wtpCount">-</span></span>
    <div id="wtpThumbGrid" class="pdfw-thumb-grid"></div>
    <pre id="wtpTxtPreview" class="wtp-txt-preview" hidden></pre>
  </div>
  <div class="row">
    <div>
      <label for="pageSize">Page size (plain text only)</label>
      <select id="pageSize">
        <option value="a4" selected>A4</option>
        <option value="letter">Letter</option>
        <option value="legal">Legal</option>
      </select>
    </div>
  </div>
  <p class="muted">Upload a <strong>.doc</strong> (Word HTML, e.g. from our PDF→Word tool) or <strong>.docx</strong>. Each embedded page image becomes one PDF page. <strong>.txt</strong> uses the page size above. Classic binary .doc (OLE) is not supported—save as .docx in Word.</p>
  <button id="runTool" data-label="Create PDF" class="btn btn-primary" type="button">Create PDF</button>`;
  const input = initUploader("up", ".doc,.docx,.txt", false);
  const inputEl = $("upInput");
  let wtpPreviewToken = 0;

  const formatWtpSize = (bytes) => {
    const n = Math.max(0, Number(bytes) || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const listDataUrlImagesFromHtml = (html) => {
    const d = new DOMParser().parseFromString(html, "text/html");
    return [...d.querySelectorAll("img")]
      .map((i) => i.src)
      .filter((src) => src && src.startsWith("data:"));
  };

  const renderWtpThumbnails = (thumbGrid, urls, token) => {
    if (!thumbGrid) return;
    thumbGrid.innerHTML = "";
    const maxThumbs = Math.min(urls.length, 6);
    for (let i = 0; i < maxThumbs; i++) {
      if (token !== wtpPreviewToken) return;
      const img = document.createElement("img");
      img.className = "pdfw-thumb";
      img.alt = `Preview ${i + 1}`;
      img.src = urls[i];
      thumbGrid.appendChild(img);
    }
    if (urls.length > maxThumbs && token === wtpPreviewToken) {
      const more = document.createElement("div");
      more.className = "pdfw-thumb-more";
      more.textContent = `+${urls.length - maxThumbs} more`;
      thumbGrid.appendChild(more);
    }
  };

  inputEl?.addEventListener("change", async () => {
    const file = input.files?.[0];
    const preview = $("wtpPreview");
    const thumbGrid = $("wtpThumbGrid");
    const txtPrev = $("wtpTxtPreview");
    const countLabel = $("wtpCountLabel");
    const countEl = $("wtpCount");
    const token = ++wtpPreviewToken;
    if (!file) {
      if (preview) preview.hidden = true;
      if (thumbGrid) thumbGrid.innerHTML = "";
      if (txtPrev) {
        txtPrev.hidden = true;
        txtPrev.textContent = "";
      }
      return;
    }
    $("wtpFileName").textContent = file.name;
    $("wtpFileSize").textContent = formatWtpSize(file.size);
    if (countEl) countEl.textContent = "-";
    if (thumbGrid) thumbGrid.innerHTML = "";
    if (txtPrev) {
      txtPrev.hidden = true;
      txtPrev.textContent = "";
    }
    if (preview) preview.hidden = false;

    const name = (file.name || "").toLowerCase();
    const ext = (name.split(".").pop() || "").toLowerCase();

    try {
      const buf = await file.arrayBuffer();
      if (token !== wtpPreviewToken) return;

      if (ext === "txt") {
        if (countLabel) countLabel.textContent = "Preview:";
        if (countEl) countEl.textContent = "text file";
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        if (txtPrev) {
          const clip = 1200;
          txtPrev.textContent = text.length > clip ? `${text.slice(0, clip)}…` : text;
          txtPrev.hidden = false;
        }
        return;
      }

      if (isOleDoc(buf)) {
        if (countLabel) countLabel.textContent = "Preview:";
        if (countEl) countEl.textContent = "—";
        if (thumbGrid) {
          thumbGrid.innerHTML = `<span class="muted">Binary .doc — no thumbnail. Save as .docx or Web Page .doc.</span>`;
        }
        return;
      }

      if (isZipDocx(buf)) {
        if (countLabel) countLabel.textContent = "Pictures:";
        let mammothApi;
        try {
          mammothApi = await importMammoth();
        } catch {
          if (token !== wtpPreviewToken) return;
          if (thumbGrid) thumbGrid.innerHTML = `<span class="muted">Could not load preview (network).</span>`;
          return;
        }
        if (token !== wtpPreviewToken) return;
        if (!mammothApi?.convertToHtml) {
          if (thumbGrid) thumbGrid.innerHTML = `<span class="muted">Preview unavailable.</span>`;
          return;
        }
        const { value: html } = await mammothApi.convertToHtml({ arrayBuffer: buf });
        if (token !== wtpPreviewToken) return;
        const urls = listDataUrlImagesFromHtml(html);
        if (countEl) countEl.textContent = String(urls.length);
        if (!urls.length && thumbGrid) {
          thumbGrid.innerHTML = `<span class="muted">No embedded pictures — PDF will be built from text only.</span>`;
        } else {
          renderWtpThumbnails(thumbGrid, urls, token);
        }
        return;
      }

      const htmlText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      if (!/<html[\s>]|<body[\s>]|xmlns:w=["']urn:schemas-microsoft-com:office:word/i.test(htmlText)) {
        if (countLabel) countLabel.textContent = "Preview:";
        if (countEl) countEl.textContent = "—";
        if (thumbGrid) {
          thumbGrid.innerHTML = `<span class="muted">Not Word HTML — open in Word and save as .docx or Web Page .doc.</span>`;
        }
        return;
      }
      if (countLabel) countLabel.textContent = "Pictures:";
      const urls = listDataUrlImagesFromHtml(htmlText);
      if (countEl) countEl.textContent = String(urls.length);
      if (!urls.length && thumbGrid) {
        thumbGrid.innerHTML = `<span class="muted">No embedded pictures in this .doc.</span>`;
      } else {
        renderWtpThumbnails(thumbGrid, urls, token);
      }
    } catch {
      if (token !== wtpPreviewToken) return;
      if (thumbGrid) thumbGrid.innerHTML = `<span class="muted">Could not build preview.</span>`;
    }
  });

  const pageSizeMap = {
    a4: [595, 842],
    letter: [612, 792],
    legal: [612, 1008]
  };

  const isZipDocx = (buf) => {
    const u = new Uint8Array(buf.slice(0, 4));
    return u[0] === 0x50 && u[1] === 0x4b;
  };

  const isOleDoc = (buf) => {
    const u = new Uint8Array(buf.slice(0, 8));
    return (
      u[0] === 0xd0 &&
      u[1] === 0xcf &&
      u[2] === 0x11 &&
      u[3] === 0xe0 &&
      u[4] === 0xa1 &&
      u[5] === 0xb1 &&
      u[6] === 0x1a &&
      u[7] === 0xe1
    );
  };

  const loadImageNaturalSize = (dataUrl) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });

  const parseImgPtDimensions = (imgEl) => {
    const style = imgEl.getAttribute("style") || "";
    const wAttr = parseFloat(imgEl.getAttribute("width") || "");
    const hAttr = parseFloat(imgEl.getAttribute("height") || "");
    const wm = style.match(/width:\s*([\d.]+)\s*pt/i);
    const hm = style.match(/height:\s*([\d.]+)\s*pt/i);
    const w = wm ? parseFloat(wm[1]) : wAttr;
    const h = hm ? parseFloat(hm[1]) : hAttr;
    if (Number.isFinite(w) && Number.isFinite(h) && w > 4 && h > 4) return { w, h };
    return null;
  };

  const collectPagesFromHtml = async (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = [...doc.querySelectorAll("img")].filter((i) => i.src && i.src.startsWith("data:"));
    const out = [];
    for (const img of imgs) {
      let dims = parseImgPtDimensions(img);
      if (!dims) {
        try {
          const nat = await loadImageNaturalSize(img.src);
          dims = { w: (nat.w * 72) / 96, h: (nat.h * 72) / 96 };
        } catch {
          continue;
        }
      }
      out.push({ dataUrl: img.src, widthPt: dims.w, heightPt: dims.h });
    }
    return out;
  };

  const embedDataUrl = async (pdf, dataUrl) => {
    const res = await fetch(dataUrl);
    const bytes = await res.arrayBuffer();
    const head = dataUrl.slice(0, 72).toLowerCase();
    if (head.includes("image/png")) return pdf.embedPng(bytes);
    if (head.includes("image/jpeg") || head.includes("image/jpg")) return pdf.embedJpg(bytes);
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return await pdf.embedJpg(bytes);
    }
  };

  const importMammoth = async () => {
    try {
      const m = await import("https://esm.sh/mammoth@1.8.0");
      return m.convertToHtml ? m : m.default;
    } catch {
      const m = await import("https://cdn.skypack.dev/mammoth@1.7.0");
      return m.convertToHtml ? m : m.default;
    }
  };

  const buildTextPdf = async (text) => {
    const pdf = await window.PDFLib.PDFDocument.create();
    const pageSize = $("pageSize").value;
    const pageDims = pageSizeMap[pageSize] || pageSizeMap.a4;
    const pageWidth = pageDims[0];
    const pageHeight = pageDims[1];
    const font = await pdf.embedFont(window.PDFLib.StandardFonts.TimesRoman);
    const fontSize = 11;
    const lineSpacing = 1.3;
    const lineHeight = fontSize * lineSpacing;
    const marginX = 40;
    const marginTop = 42;
    const marginBottom = 42;
    const maxTextWidth = pageWidth - marginX * 2;
    const wrapLine = (rawLine) => {
      if (!rawLine.trim()) return [""];
      const words = rawLine.split(/\s+/);
      const out = [];
      let current = "";
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, fontSize);
        if (width <= maxTextWidth) current = candidate;
        else {
          if (current) out.push(current);
          current = word;
          while (font.widthOfTextAtSize(current, fontSize) > maxTextWidth && current.length > 1) {
            let cut = current.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(`${current.slice(0, cut)}-`, fontSize) > maxTextWidth) cut--;
            out.push(`${current.slice(0, cut)}-`);
            current = current.slice(cut);
          }
        }
      });
      if (current) out.push(current);
      return out;
    };
    const lines = [];
    text.split("\n").forEach((line) => {
      lines.push(...wrapLine(line));
    });
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - marginTop;
    for (let i = 0; i < lines.length; i++) {
      if (y < marginBottom) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop;
      }
      page.drawText(lines[i], {
        x: marginX,
        y,
        size: fontSize,
        font,
        color: window.PDFLib.rgb(0, 0, 0)
      });
      y -= lineHeight;
    }
    return pdf;
  };

  const buildImagePagesPdf = async (pages) => {
    const pdf = await window.PDFLib.PDFDocument.create();
    for (const p of pages) {
      const w = Math.min(14400, Math.max(12, p.widthPt));
      const h = Math.min(14400, Math.max(12, p.heightPt));
      const image = await embedDataUrl(pdf, p.dataUrl);
      const page = pdf.addPage([w, h]);
      page.drawImage(image, { x: 0, y: 0, width: w, height: h });
    }
    return pdf;
  };

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const file = input.files?.[0];
      if (!file) return showResult("Please upload a .doc, .docx, or .txt file.", "error");
      const name = (file.name || "").toLowerCase();
      const ext = (name.split(".").pop() || "").toLowerCase();
      if (!["doc", "docx", "txt"].includes(ext)) {
        return showResult("Please upload a .doc, .docx, or .txt file.", "error");
      }

      const buf = await file.arrayBuffer();

      if (ext === "txt") {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf).trim();
        if (!text) return showResult("Text file is empty.", "error");
        const pdf = await buildTextPdf(text);
        downloadBlob(new Blob([await pdf.save()]), "word-to-pdf.pdf");
        setProgress(100);
        showResult(`PDF created (${pdf.getPageCount()} pages).`);
        return;
      }

      if (isOleDoc(buf)) {
        return showResult(
          "This binary .doc format is not supported. In Word: Save As → .docx, or Save As → Web Page for an HTML-based .doc.",
          "error"
        );
      }

      if (isZipDocx(buf)) {
        let mammothApi;
        try {
          mammothApi = await importMammoth();
        } catch {
          return showResult("Could not load the Word converter. Check your connection and try again.", "error");
        }
        if (!mammothApi?.convertToHtml) {
          return showResult("Word converter failed to initialize. Check your connection and try again.", "error");
        }
        const htmlResult = await mammothApi.convertToHtml({ arrayBuffer: buf });
        const html = htmlResult?.value || "";
        let pages = await collectPagesFromHtml(html);
        if (!pages.length) {
          const rawResult = await mammothApi.extractRawText({ arrayBuffer: buf });
          const raw = (rawResult?.value || "").trim();
          if (!raw) return showResult("No readable content found in the Word file.", "error");
          const pdf = await buildTextPdf(raw);
          downloadBlob(new Blob([await pdf.save()]), "word-to-pdf.pdf");
          setProgress(100);
          showResult(`PDF created from text (${pdf.getPageCount()} pages).`);
          return;
        }
        const pdf = await buildImagePagesPdf(pages);
        downloadBlob(new Blob([await pdf.save()]), "word-to-pdf.pdf");
        setProgress(100);
        showResult(`PDF created (${pdf.getPageCount()} pages from images).`);
        return;
      }

      const htmlText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      if (!/<html[\s>]|<body[\s>]|xmlns:w=["']urn:schemas-microsoft-com:office:word/i.test(htmlText)) {
        return showResult(
          "This .doc file is not Word HTML. Open it in Word and Save As .docx, or Save As Web Page (.doc).",
          "error"
        );
      }
      const pages = await collectPagesFromHtml(htmlText);
      if (!pages.length) {
        return showResult(
          "No embedded pictures found in this .doc. Save as .docx for text, or use a file from our PDF→Word tool.",
          "error"
        );
      }
      const pdf = await buildImagePagesPdf(pages);
      downloadBlob(new Blob([await pdf.save()]), "word-to-pdf.pdf");
      setProgress(100);
      showResult(`PDF created (${pdf.getPageCount()} pages from images).`);
    } catch {
      showResult("Word to PDF failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolImageCrop() {
  const f = $("toolForm");
  const isEditorMode = window.location.pathname.includes("/image-tools/image-crop/editor");
  const STORAGE_KEY = "qt-image-crop-editor-payload-v1";
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const formatSize = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const openCropBlobDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open("qt-image-crop-db", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("db open failed"));
  });
  const dbPutBlob = async (key, blob) => {
    const db = await openCropBlobDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("db put failed"));
    });
    db.close();
  };
  const dbGetBlob = async (key) => {
    const db = await openCropBlobDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const req = tx.objectStore("files").get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("db get failed"));
    });
    db.close();
    return value;
  };
  const dbDeleteBlob = async (key) => {
    const db = await openCropBlobDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("db delete failed"));
    });
    db.close();
  };

  if (!isEditorMode) {
    f.innerHTML = `<div class="crop-upload-wrap"><div id="up"></div><div id="cropUploadCard" class="resize-upload-card" hidden><div class="resize-upload-row"><div class="resize-upload-meta"><strong id="cropUploadName">-</strong><span id="cropUploadSize">-</span></div><div id="cropUploadPct" class="resize-upload-pct">Uploading 0%</div></div><progress id="cropUploadProgress" max="100" value="0"></progress></div></div>`;
    const input = initUploader("up", ".jpg,.jpeg,.png,.webp", false);
    let timer = null;
    const setUpload = (v) => {
      const p = clamp(Math.round(v), 0, 100);
      $("cropUploadProgress").value = p;
      $("cropUploadPct").textContent = `Uploading ${p}%`;
    };
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const err = validateFiles([file], ["jpg", "jpeg", "png", "webp"]);
      if (err) return showResult(err, "error");
      if (timer) clearInterval(timer);
      $("cropUploadCard").hidden = false;
      $("cropUploadName").textContent = file.name;
      $("cropUploadSize").textContent = formatSize(file.size);
      setUpload(0);
      const blobKey = `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        await dbPutBlob(blobKey, file);
      } catch {
        showResult("Could not prepare image for crop editor.", "error");
        return;
      }
      let p = 0;
      timer = setInterval(() => {
        p += Math.max(8, Math.round(Math.random() * 18));
        if (p >= 100) {
          p = 100;
          clearInterval(timer);
          setUpload(100);
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name: file.name, type: file.type, blobKey }));
          } catch {
            showResult("Could not keep upload data for editor page.", "error");
            return;
          }
          setTimeout(() => window.location.assign(new URL("./editor/index.html", window.location.href).toString()), 180);
        } else setUpload(p);
      }, 90);
    });
    return;
  }

  f.innerHTML = `<section class="crop-editor-page"><div class="crop-editor-shell"><div class="crop-stage-wrap"><div id="cropStage" class="crop-stage"><img id="cropImage" alt="Crop preview"><div id="cropRect" class="crop-rect"><span class="crop-handle crop-handle-nw" data-handle="nw"></span><span class="crop-handle crop-handle-ne" data-handle="ne"></span><span class="crop-handle crop-handle-sw" data-handle="sw"></span><span class="crop-handle crop-handle-se" data-handle="se"></span></div></div></div><aside class="crop-side-panel"><h3>Crop options</h3><label>Width (px)</label><input id="cropW" type="number" min="1" step="1"><label>Height (px)</label><input id="cropH" type="number" min="1" step="1"><label>Position X (px)</label><input id="cropX" type="number" min="0" step="1"><label>Position Y (px)</label><input id="cropY" type="number" min="0" step="1"><label>Estimated size</label><input id="cropEstSize" readonly><button id="applyCropValues" class="btn btn-ghost" type="button">Apply</button><button id="runTool" data-label="Download" class="btn btn-primary" type="button">Download</button></aside></div></section>`;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  const payload = raw ? JSON.parse(raw) : null;
  if (!payload?.dataUrl && !payload?.objectUrl && !payload?.blobKey) {
    showResult("No uploaded image found. Please upload again.", "error");
    f.innerHTML = `<div class="actions"><a class="btn btn-ghost" href="../index.html">Back to upload</a></div>`;
    return;
  }

  const imgEl = $("cropImage");
  const stage = $("cropStage");
  const rect = $("cropRect");
  let naturalW = 0, naturalH = 0, scale = 1;
  let crop = { x: 0, y: 0, w: 100, h: 100 };
  let drag = null;
  let estimateTimer = null;
  let estimateToken = 0;
  const ext = (payload.name.split(".").pop() || "").toLowerCase();
  const outMime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const syncInputs = () => { $("cropX").value = String(crop.x); $("cropY").value = String(crop.y); $("cropW").value = String(crop.w); $("cropH").value = String(crop.h); };
  const renderRect = () => {
    rect.style.left = `${Math.round(crop.x * scale)}px`;
    rect.style.top = `${Math.round(crop.y * scale)}px`;
    rect.style.width = `${Math.max(1, Math.round(crop.w * scale))}px`;
    rect.style.height = `${Math.max(1, Math.round(crop.h * scale))}px`;
  };
  const formatOutSize = (bytes) => {
    if (!Number.isFinite(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const scheduleEstimate = () => {
    if (estimateTimer) clearTimeout(estimateTimer);
    estimateTimer = setTimeout(async () => {
      const token = ++estimateToken;
      const c = document.createElement("canvas");
      c.width = Math.max(1, crop.w);
      c.height = Math.max(1, crop.h);
      c.getContext("2d").drawImage(imgEl, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      const blob = await new Promise((res) => c.toBlob(res, outMime, outMime === "image/png" ? undefined : 0.92));
      if (token !== estimateToken) return;
      $("cropEstSize").value = blob ? formatOutSize(blob.size) : "-";
    }, 120);
  };
  const applyCrop = (next) => {
    crop.w = clamp(Math.round(next.w), 1, naturalW);
    crop.h = clamp(Math.round(next.h), 1, naturalH);
    crop.x = clamp(Math.round(next.x), 0, Math.max(0, naturalW - crop.w));
    crop.y = clamp(Math.round(next.y), 0, Math.max(0, naturalH - crop.h));
    syncInputs();
    renderRect();
    scheduleEstimate();
  };

  imgEl.onload = () => {
    naturalW = imgEl.naturalWidth || imgEl.width;
    naturalH = imgEl.naturalHeight || imgEl.height;
    const maxW = Math.max(420, Math.min(1100, window.innerWidth - 360));
    // Horizontal guard: fit width. Vertical can grow with page.
    scale = Math.min(1, maxW / naturalW);
    stage.style.width = `${Math.round(naturalW * scale)}px`;
    stage.style.height = `${Math.round(naturalH * scale)}px`;
    applyCrop({ x: naturalW * 0.25, y: naturalH * 0.25, w: naturalW * 0.5, h: naturalH * 0.5 });
  };
  const assignImageSource = async () => {
    if (payload.objectUrl || payload.dataUrl) {
      imgEl.src = payload.objectUrl || payload.dataUrl;
      return;
    }
    if (payload.blobKey) {
      const blob = await dbGetBlob(payload.blobKey).catch(() => null);
      if (!blob) {
        showResult("Uploaded image not found. Please upload again.", "error");
        return;
      }
      const tempUrl = URL.createObjectURL(blob);
      imgEl.src = tempUrl;
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl);
        dbDeleteBlob(payload.blobKey).catch(() => {});
      }, 2500);
    }
  };
  assignImageSource();

  rect.addEventListener("pointerdown", (ev) => {
    drag = { type: ev.target?.dataset?.handle || "move", sx: ev.clientX, sy: ev.clientY, start: { ...crop } };
    rect.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  rect.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const dx = (ev.clientX - drag.sx) / Math.max(0.0001, scale);
    const dy = (ev.clientY - drag.sy) / Math.max(0.0001, scale);
    const n = { ...drag.start };
    if (drag.type === "move") { n.x += dx; n.y += dy; }
    else {
      if (drag.type.includes("e")) n.w += dx;
      if (drag.type.includes("s")) n.h += dy;
      if (drag.type.includes("w")) { n.x += dx; n.w -= dx; }
      if (drag.type.includes("n")) { n.y += dy; n.h -= dy; }
    }
    applyCrop(n);
  });
  rect.addEventListener("pointerup", () => { drag = null; });
  rect.addEventListener("pointercancel", () => { drag = null; });
  const applyInputs = () => applyCrop({ x: Number($("cropX").value), y: Number($("cropY").value), w: Number($("cropW").value), h: Number($("cropH").value) });
  $("applyCropValues").addEventListener("click", applyInputs);
  ["cropX", "cropY", "cropW", "cropH"].forEach((id) => $(id).addEventListener("change", applyInputs));

  $("runTool").addEventListener("click", async () => {
    runButton(true);
    try {
      const c = document.createElement("canvas");
      c.width = crop.w;
      c.height = crop.h;
      c.getContext("2d").drawImage(imgEl, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      const blob = await new Promise((res) => c.toBlob(res, outMime, outMime === "image/png" ? undefined : 0.92));
      if (!blob) return showResult("Image crop failed.", "error");
      downloadBlob(blob, `cropped.${outMime === "image/png" ? "png" : outMime === "image/webp" ? "webp" : "jpg"}`);
      showResult("Image cropped.");
    } catch {
      showResult("Image crop failed.", "error");
    } finally {
      runButton(false);
    }
  });
}

function toolCaseConverter() {
  const f = $("toolForm");
  f.innerHTML = `<label>Input text</label><textarea id="txt"></textarea>
  <div class="case-grid">
    <article class="case-card">
      <div class="case-head"><span class="stat-label">UPPERCASE</span><button class="btn case-copy-btn" data-copy-target="upTxt" type="button">Copy</button></div>
      <div id="upTxt" class="case-output"></div>
    </article>
    <article class="case-card">
      <div class="case-head"><span class="stat-label">lowercase</span><button class="btn case-copy-btn" data-copy-target="lowTxt" type="button">Copy</button></div>
      <div id="lowTxt" class="case-output"></div>
    </article>
    <article class="case-card">
      <div class="case-head"><span class="stat-label">camelCase</span><button class="btn case-copy-btn" data-copy-target="camelTxt" type="button">Copy</button></div>
      <div id="camelTxt" class="case-output"></div>
    </article>
  </div>`;
  const render = () => {
    const t = $("txt").value;
    $("upTxt").textContent = t.toUpperCase();
    $("lowTxt").textContent = t.toLowerCase();
    $("camelTxt").textContent = t
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("");
    setProgress(100);
    showResult("Live case conversion active.");
  };
  const bindCopyButtons = () => {
    document.querySelectorAll(".case-copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = document.getElementById(btn.dataset.copyTarget);
        const text = (target?.textContent || "").trim();
        if (!text) return;
        await navigator.clipboard.writeText(text);
        showResult("Copied to clipboard.");
      });
    });
  };
  bindCopyButtons();
  $("txt").addEventListener("input", render);
  render();
}

function toolSlugGenerator() {
  const f = $("toolForm");
  f.innerHTML = `
    <label>Input text</label>
    <textarea id="txt"></textarea>
    <label>Generated slug</label>
    <div class="slug-output-row">
      <textarea id="slug" class="slug-output" readonly></textarea>
      <button id="copySlug" class="btn slug-copy-btn" type="button" aria-label="Copy slug" title="Copy slug">Copy</button>
    </div>`;

  const makeSlug = (value, maxLen = null) => {
    const source = String(value ?? "");
    const normalized = source.toLowerCase().normalize("NFKD");
    const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, "");
    const asciiOnly = withoutAccents.replace(/[^\x00-\x7F]/g, "");
    const alnumAndSpace = asciiOnly.replace(/[^a-z0-9\s]/g, " ");
    const withHyphens = alnumAndSpace.trim().replace(/\s+/g, "-");
    const collapsed = withHyphens.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    if (typeof maxLen !== "number" || maxLen <= 0) return collapsed;
    return collapsed.slice(0, maxLen).replace(/-+$/g, "");
  };

  const autoGrowSlugOutput = () => {
    const outputEl = $("slug");
    if (!outputEl) return;
    outputEl.style.height = "auto";
    outputEl.style.height = `${Math.max(44, outputEl.scrollHeight)}px`;
  };

  const render = () => {
    $("slug").value = makeSlug($("txt").value);
    autoGrowSlugOutput();
    setProgress(100);
    showResult("Slug ready.");
  };
  $("copySlug").addEventListener("click", async () => {
    const output = $("slug").value.trim();
    if (!output) return;
    await navigator.clipboard.writeText(output);
    showResult("Copied to clipboard.");
  });
  $("txt").addEventListener("input", render);
  window.addEventListener("resize", autoGrowSlugOutput);
  render();
}

function toolAgeCalculator() {
  const f = $("toolForm");
  f.innerHTML = `
    <div class="age-card">
      <div class="age-head">
        <span class="age-icon">📅</span>
        <div>
          <strong>Date of birth</strong>
          <p class="muted">Select year, then month, then day.</p>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="fromYear">From year</label>
          <select id="fromYear"><option value="">Select year</option></select>
        </div>
        <div>
          <label for="fromMonth">From month</label>
          <select id="fromMonth" disabled><option value="">Select month</option></select>
        </div>
        <div>
          <label for="fromDay">From day</label>
          <select id="fromDay" disabled><option value="">Select day</option></select>
        </div>
      </div>
      <div class="row">
        <div class="age-mode-wrap">
          <input id="toToday" class="age-mode-input" type="checkbox" checked>
          <label class="age-mode-toggle" for="toToday">
            <span class="age-mode-pill" aria-hidden="true"></span>
            <span class="age-mode-title">To today</span>
            <span class="age-mode-sub">Use current date instantly</span>
          </label>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="toYear">To year</label>
          <select id="toYear" disabled><option value="">Select year</option></select>
        </div>
        <div>
          <label for="toMonth">To month</label>
          <select id="toMonth" disabled><option value="">Select month</option></select>
        </div>
        <div>
          <label for="toDay">To day</label>
          <select id="toDay" disabled><option value="">Select day</option></select>
        </div>
      </div>
    </div>
    <label>Result</label>
    <input id="outAge" readonly>
    <button id="runTool" data-label="Calculate Age" class="btn btn-primary" type="button">Calculate Age</button>`;
  const now = new Date();
  const fromYearEl = $("fromYear");
  const fromMonthEl = $("fromMonth");
  const fromDayEl = $("fromDay");
  const toYearEl = $("toYear");
  const toMonthEl = $("toMonth");
  const toDayEl = $("toDay");
  const toTodayEl = $("toToday");
  const startYear = now.getFullYear();
  const minYear = 1900;
  const toYearMax = 2300;
  for (let y = startYear; y >= minYear; y--) {
    const a = document.createElement("option");
    a.value = String(y);
    a.textContent = String(y);
    fromYearEl.appendChild(a);
  }
  for (let y = toYearMax; y >= minYear; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    toYearEl.appendChild(opt);
  }
  const addMonths = (el) => {
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = String(m);
      el.appendChild(opt);
    }
  };
  addMonths(fromMonthEl);
  addMonths(toMonthEl);
  const refreshDays = (yearEl, monthEl, dayEl) => {
    const y = Number(yearEl.value);
    const m = Number(monthEl.value);
    dayEl.innerHTML = `<option value="">Select day</option>`;
    if (!y || !m) {
      dayEl.disabled = true;
      return;
    }
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const opt = document.createElement("option");
      opt.value = String(d);
      opt.textContent = String(d);
      dayEl.appendChild(opt);
    }
    dayEl.disabled = false;
  };
  const resetChain = (yearEl, monthEl, dayEl) => {
    monthEl.disabled = !yearEl.value;
    monthEl.value = "";
    dayEl.value = "";
    dayEl.disabled = true;
    refreshDays(yearEl, monthEl, dayEl);
  };
  fromYearEl.addEventListener("change", () => {
    resetChain(fromYearEl, fromMonthEl, fromDayEl);
  });
  fromMonthEl.addEventListener("change", () => {
    fromDayEl.value = "";
    refreshDays(fromYearEl, fromMonthEl, fromDayEl);
  });
  toYearEl.addEventListener("change", () => {
    resetChain(toYearEl, toMonthEl, toDayEl);
  });
  toMonthEl.addEventListener("change", () => {
    toDayEl.value = "";
    refreshDays(toYearEl, toMonthEl, toDayEl);
  });
  const setToCurrentDateDefaults = () => {
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1);
    const currentDay = String(now.getDate());
    toYearEl.value = currentYear;
    toMonthEl.disabled = false;
    toMonthEl.value = currentMonth;
    refreshDays(toYearEl, toMonthEl, toDayEl);
    toDayEl.value = currentDay;
  };
  const syncToMode = () => {
    const disabled = toTodayEl.checked;
    toYearEl.disabled = disabled;
    if (disabled) {
      toMonthEl.disabled = true;
      toDayEl.disabled = true;
    } else {
      setToCurrentDateDefaults();
    }
  };
  toTodayEl.addEventListener("change", syncToMode);
  syncToMode();
  $("runTool").addEventListener("click", () => {
    const y = Number(fromYearEl.value);
    const m = Number(fromMonthEl.value);
    const d = Number(fromDayEl.value);
    if (!y || !m || !d) return showResult("Please select year, month, and day.", "error");
    const dob = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (Number.isNaN(dob.getTime())) return showResult("Please select a valid date.", "error");
    let endDate = new Date();
    if (!toTodayEl.checked) {
      const ty = Number(toYearEl.value);
      const tm = Number(toMonthEl.value);
      const td = Number(toDayEl.value);
      if (!ty || !tm || !td) return showResult("Please select a valid 'to' date.", "error");
      endDate = new Date(ty, tm - 1, td, 0, 0, 0, 0);
    }
    let age = endDate.getFullYear() - dob.getFullYear();
    const birthdayThisYear = new Date(
      endDate.getFullYear(),
      dob.getMonth(),
      dob.getDate(),
      0,
      0,
      0,
      0
    );
    if (endDate < birthdayThisYear) age--;
    const diffMs = endDate.getTime() - dob.getTime();
    const absDays = Math.floor(Math.abs(diffMs) / 86400000);
    const absWeeks = Math.floor(absDays / 7);
    const absMonths = Math.floor(absDays / 30);
    const detail = `${age} years (${absDays} days, ${absMonths} months, ${absWeeks} weeks)`;
    const flowText = toTodayEl.checked
      ? `${absDays} days, from selected date to today`
      : `${absDays} days from selected date to target date`;
    $("outAge").value = detail;
    setProgress(100);
    showResult(`Age calculated. ${flowText}. ${detail}`);
  });
}

function toolCurrencyConverter() {
  const f = $("toolForm");
  f.innerHTML = `
    <div class="row">
      <div><label>Amount</label><input id="amt" type="number" value="100" min="0" step="0.01"></div>
      <div><label>From</label><select id="fromCur"></select></div>
      <div><label>To</label><select id="toCur"></select></div>
    </div>
    <div class="actions">
      <button id="swapCur" class="btn" type="button">Swap</button>
    </div>
    <label>Result</label><input id="curOut" readonly>
    <p id="curMeta" class="muted">Loading currency list...</p>`;

  const currencyName = {
    USD: "US Dollar", EUR: "Euro", GBP: "British Pound", TRY: "Turkish Lira", JPY: "Japanese Yen",
    CNY: "Chinese Yuan", KRW: "South Korean Won", INR: "Indian Rupee", RUB: "Russian Ruble",
    CAD: "Canadian Dollar", AUD: "Australian Dollar", NZD: "New Zealand Dollar",
    CHF: "Swiss Franc", SEK: "Swedish Krona", NOK: "Norwegian Krone", DKK: "Danish Krone",
    PLN: "Polish Zloty", CZK: "Czech Koruna", HUF: "Hungarian Forint", RON: "Romanian Leu",
    BGN: "Bulgarian Lev", UAH: "Ukrainian Hryvnia", BRL: "Brazilian Real", MXN: "Mexican Peso",
    ARS: "Argentine Peso", CLP: "Chilean Peso", COP: "Colombian Peso", PEN: "Peruvian Sol",
    ZAR: "South African Rand", EGP: "Egyptian Pound", NGN: "Nigerian Naira", AED: "UAE Dirham",
    SAR: "Saudi Riyal", QAR: "Qatari Riyal", KWD: "Kuwaiti Dinar", BHD: "Bahraini Dinar",
    OMR: "Omani Rial", JOD: "Jordanian Dinar", ILS: "Israeli Shekel", PKR: "Pakistani Rupee",
    BDT: "Bangladeshi Taka", LKR: "Sri Lankan Rupee", THB: "Thai Baht", VND: "Vietnamese Dong",
    IDR: "Indonesian Rupiah", MYR: "Malaysian Ringgit", SGD: "Singapore Dollar", PHP: "Philippine Peso",
    HKD: "Hong Kong Dollar", TWD: "New Taiwan Dollar", KZT: "Kazakhstani Tenge", UZS: "Uzbekistani Som",
    GEL: "Georgian Lari", AMD: "Armenian Dram", AZN: "Azerbaijani Manat"
  };

  const fromEl = $("fromCur");
  const toEl = $("toCur");
  const amtEl = $("amt");
  const metaEl = $("curMeta");
  let ratesTimestamp = 0;
  const storageKey = "currency-converter-state-v2";

  const formatOptionLabel = (code, name) => `${code} - ${name}`;

  const loadSavedState = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saveState = () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          from: fromEl.value,
          to: toEl.value,
          amount: amtEl.value
        })
      );
    } catch {
      // ignore storage issues
    }
  };

  const loadCurrencies = () => {
    const entries = Object.entries(currencyName).sort((a, b) => a[0].localeCompare(b[0]));
    const options = entries.map(([code, name]) => `<option value="${code}">${formatOptionLabel(code, name)}</option>`).join("");
    fromEl.innerHTML = options;
    toEl.innerHTML = options;
    const saved = loadSavedState();
    fromEl.value = saved?.from && currencyName[saved.from] ? saved.from : "EUR";
    toEl.value = saved?.to && currencyName[saved.to] ? saved.to : "USD";
    amtEl.value = saved?.amount ?? "100";
  };

  const fetchRates = async (base) => {
    // Primary source
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      if (data?.rates && data?.result === "success") {
        return { rates: data.rates };
      }
    } catch {
      // continue to fallback
    }
    // Fallback source
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
    const data = await res.json();
    if (data?.rates) {
      return { rates: { ...data.rates, [base]: 1 } };
    }
    throw new Error("No rate source available");
  };

  const convert = async () => {
    try {
      const amt = Number($("amt").value || 0);
      const from = fromEl.value;
      const to = toEl.value;
      if (!from || !to) return showResult("Please select currencies.", "error");
      if (from === to) {
        $("curOut").value = `${amt.toFixed(2)} ${to}`;
        return showResult("Same currency selected.");
      }
      // Always fetch fresh rates on each interaction.
      const payload = await fetchRates(from);
      const rate = payload.rates?.[to];
      if (typeof rate !== "number") return showResult("Rate not available for selected currencies.", "error");
      const out = amt * rate;
      $("curOut").value = `${out.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${to}`;
      ratesTimestamp = Date.now();
      metaEl.textContent = `Last update: ${new Date(ratesTimestamp).toLocaleTimeString()}`;
      setProgress(100);
      showResult("Currency converted.");
    } catch {
      showResult("Currency conversion failed.", "error");
    }
  };

  $("swapCur").addEventListener("click", () => {
    const fVal = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = fVal;
    saveState();
    convert();
  });
  fromEl.addEventListener("change", () => {
    saveState();
    convert();
  });
  toEl.addEventListener("change", () => {
    saveState();
    convert();
  });
  amtEl.addEventListener("input", () => {
    saveState();
    convert();
  });

  loadCurrencies();
  saveState();
  convert().catch(() => {
    metaEl.textContent = "Could not fetch live rates. Please retry.";
    showResult("Currency conversion temporarily unavailable.", "error");
  });
}

function toolCalculator() {
  const f = $("toolForm");
  const prog = $("toolProgress");
  if (prog) prog.style.display = "none";
  const resultEl = $("result");
  if (resultEl) resultEl.style.display = "none";

  f.innerHTML = `
  <div class="calc-tool">
    <div class="calc-skin calc-skin--scientific" role="application" aria-label="Scientific calculator">
      <div class="calc-top-bar">
        <button type="button" class="calc-gear" id="calcGear" aria-expanded="false" aria-controls="calcHintPanel" title="Help">⚙</button>
        <span class="calc-mem-indicator" id="calcMemInd" aria-hidden="true"></span>
        <div class="calc-angle-row" role="group" aria-label="Angle mode">
          <button type="button" class="calc-mode-btn is-active" id="calcDeg" data-mode="deg">DEG</button>
          <button type="button" class="calc-mode-btn" id="calcRad" data-mode="rad">RAD</button>
        </div>
        <div class="calc-hint-panel" id="calcHintPanel" hidden>
          <p class="calc-hint-text">Open <strong>Advanced</strong> for memory keys, trig, logs, π/e, and factorial. Type expressions with parentheses, e.g. <code>sin(30)+sqrt(16)</code> (DEG uses degrees for sin/cos/tan). Operators: <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> <kbd>^</kbd> power. <kbd>Enter</kbd> evaluates; <kbd>Esc</kbd> or <kbd>Alt</kbd>+<kbd>C</kbd> clears. <kbd>Backspace</kbd> deletes one character.</p>
        </div>
      </div>
      <div class="calc-display-wrap">
        <output class="calc-display calc-display--expr" id="calcDisplay" aria-live="polite" aria-atomic="true">0</output>
      </div>
      <button type="button" class="calc-advanced-toggle" id="calcAdvToggle" aria-expanded="false" aria-controls="calcAdvancedPanel">
        <span>Advanced</span>
        <span class="calc-advanced-chevron" aria-hidden="true">▼</span>
      </button>
      <div class="calc-advanced-panel" id="calcAdvancedPanel" hidden>
        <div class="calc-memory-row">
          <button type="button" class="calc-btn calc-btn--mem" data-act="mc">MC</button>
          <button type="button" class="calc-btn calc-btn--mem" data-act="mr">MR</button>
          <button type="button" class="calc-btn calc-btn--mem" data-act="mplus">M+</button>
          <button type="button" class="calc-btn calc-btn--mem" data-act="mminus">M−</button>
          <button type="button" class="calc-btn calc-btn--mem" data-act="ms">MS</button>
        </div>
        <div class="calc-grid calc-grid--sci">
          <button type="button" class="calc-btn calc-btn--sci" data-ins="(">(</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins=")">)</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="^">^</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="sqrt(">√</button>
          <button type="button" class="calc-btn calc-btn--sci" data-act="square">x²</button>
          <button type="button" class="calc-btn calc-btn--sci" data-act="inv">1/x</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="ln(">ln</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="log(">log</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="sin(">sin</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="cos(">cos</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="tan(">tan</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="asin(">sin⁻¹</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="acos(">cos⁻¹</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="atan(">tan⁻¹</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="abs(">abs</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="pi">π</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="e">e</button>
          <button type="button" class="calc-btn calc-btn--sci" data-ins="!">n!</button>
        </div>
      </div>
      <div class="calc-grid calc-grid--main">
        <button type="button" class="calc-btn calc-btn--fn" data-act="clear">AC</button>
        <button type="button" class="calc-btn calc-btn--fn" data-act="sign">±</button>
        <button type="button" class="calc-btn calc-btn--fn" data-act="percent">%</button>
        <button type="button" class="calc-btn calc-btn--op" data-ins="/">÷</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="7">7</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="8">8</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="9">9</button>
        <button type="button" class="calc-btn calc-btn--op" data-ins="*">×</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="4">4</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="5">5</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="6">6</button>
        <button type="button" class="calc-btn calc-btn--op" data-ins="-">−</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="1">1</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="2">2</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit="3">3</button>
        <button type="button" class="calc-btn calc-btn--op" data-ins="+">+</button>
        <button type="button" class="calc-btn calc-btn--num calc-btn--zero" data-digit="0">0</button>
        <button type="button" class="calc-btn calc-btn--num" data-digit=".">.</button>
        <button type="button" class="calc-btn calc-btn--op" data-act="equals">=</button>
      </div>
    </div>
  </div>`;

  const out = $("calcDisplay");
  const gear = $("calcGear");
  const hint = $("calcHintPanel");
  const memInd = $("calcMemInd");
  const btnDeg = $("calcDeg");
  const btnRad = $("calcRad");
  const advToggle = $("calcAdvToggle");
  const advPanel = $("calcAdvancedPanel");
  const skinEl = f.querySelector(".calc-skin");
  const advChevron = advToggle?.querySelector(".calc-advanced-chevron");

  const setAdvancedOpen = (open) => {
    if (!advPanel || !advToggle || !skinEl) return;
    if (open) {
      advPanel.removeAttribute("hidden");
      skinEl.classList.add("calc-skin--advanced-open");
    } else {
      advPanel.setAttribute("hidden", "");
      skinEl.classList.remove("calc-skin--advanced-open");
    }
    advToggle.setAttribute("aria-expanded", String(open));
    if (advChevron) advChevron.textContent = open ? "▲" : "▼";
  };

  advToggle?.addEventListener("click", () => {
    setAdvancedOpen(advPanel.hasAttribute("hidden"));
  });
  setAdvancedOpen(false);

  let buffer = "";
  let freshResult = false;
  let angleDeg = true;
  let memory = 0;

  const formatResult = (n) => {
    if (!Number.isFinite(n)) return "Error";
    if (Math.abs(n) >= 1e15 || (Math.abs(n) > 0 && Math.abs(n) < 1e-9)) return n.toExponential(8);
    const rounded = Number.parseFloat(Number(n).toPrecision(14));
    let s = String(rounded);
    if (s.length > 18) s = rounded.toPrecision(12);
    return s;
  };

  const factorial = (x) => {
    if (!Number.isFinite(x) || x < 0 || x !== Math.floor(x) || x > 170) return NaN;
    let r = 1;
    for (let i = 2; i <= x; i++) r *= i;
    return r;
  };

  const tokenizeCalc = (input) => {
    const s = input.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
    const tokens = [];
    let i = 0;
    const push = (t) => {
      tokens.push(t);
    };
    const peek = () => s[i];
    const keywords = [
      ["asin", "ASIN"],
      ["acos", "ACOS"],
      ["atan", "ATAN"],
      ["sqrt", "SQRT"],
      ["sin", "SIN"],
      ["cos", "COS"],
      ["tan", "TAN"],
      ["log", "LOG"],
      ["ln", "LN"],
      ["abs", "ABS"],
      ["pi", "PI"]
    ];
    while (i < s.length) {
      const c = s[i];
      if (c === "(") {
        push({ type: "LPAREN" });
        i++;
        continue;
      }
      if (c === ")") {
        push({ type: "RPAREN" });
        i++;
        continue;
      }
      if (c === "+" || c === "*" || c === "/" || c === "^") {
        push({ type: c === "+" ? "PLUS" : c === "*" ? "MUL" : c === "/" ? "DIV" : "POW" });
        i++;
        continue;
      }
      if (c === "-") {
        push({ type: "MINUS" });
        i++;
        continue;
      }
      if (c === "!") {
        push({ type: "FACT" });
        i++;
        continue;
      }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        if ((s[j] === "e" || s[j] === "E") && /[+\-]?[0-9]/.test(s.slice(j + 1, j + 3))) {
          j++;
          if (s[j] === "+" || s[j] === "-") j++;
          while (/\d/.test(s[j])) j++;
        }
        const raw = s.slice(i, j);
        const v = Number.parseFloat(raw);
        if (!Number.isFinite(v)) throw new Error("number");
        push({ type: "NUMBER", value: v });
        i = j;
        continue;
      }
      let matched = false;
      for (const [kw, typ] of keywords) {
        if (s.startsWith(kw, i)) {
          push({ type: typ });
          i += kw.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      if (c === "e" && !/[0-9]/.test(s[i + 1] || "")) {
        push({ type: "E_CONST" });
        i++;
        continue;
      }
      throw new Error("parse");
    }
    push({ type: "EOF" });
    return tokens;
  };

  const evaluateTokens = (tokens, deg) => {
    let pos = 0;
    const peek = () => tokens[pos];
    const eat = (type) => {
      const t = peek();
      if (!t || t.type !== type) throw new Error("syntax");
      pos++;
      return t;
    };

    const toRad = (a) => (deg ? (a * Math.PI) / 180 : a);
    const fromRad = (a) => (deg ? (a * 180) / Math.PI : a);

    const parseExpr = () => {
      let left = parseTerm();
      while (peek()?.type === "PLUS" || peek()?.type === "MINUS") {
        const op = peek().type;
        pos++;
        const right = parseTerm();
        left = op === "PLUS" ? left + right : left - right;
      }
      return left;
    };

    const parseTerm = () => {
      let left = parsePower();
      while (peek()?.type === "MUL" || peek()?.type === "DIV") {
        const op = peek().type;
        pos++;
        const right = parsePower();
        left = op === "MUL" ? left * right : left / right;
      }
      return left;
    };

    const parsePower = () => {
      let left = parseUnary();
      if (peek()?.type === "POW") {
        pos++;
        const right = parsePower();
        left = left ** right;
      }
      return left;
    };

    const parseUnary = () => {
      if (peek()?.type === "MINUS") {
        pos++;
        return -parseUnary();
      }
      return parsePostfix();
    };

    const parsePostfix = () => {
      let val = parsePrimary();
      while (peek()?.type === "FACT") {
        pos++;
        val = factorial(val);
      }
      return val;
    };

    const parsePrimary = () => {
      const t = peek();
      if (!t || t.type === "EOF") throw new Error("syntax");
      if (t.type === "NUMBER") {
        pos++;
        return t.value;
      }
      if (t.type === "PI") {
        pos++;
        return Math.PI;
      }
      if (t.type === "E_CONST") {
        pos++;
        return Math.E;
      }
      if (t.type === "LPAREN") {
        pos++;
        const v = parseExpr();
        eat("RPAREN");
        return v;
      }
      const fn = (name, argFn) => {
        pos++;
        eat("LPAREN");
        const arg = parseExpr();
        eat("RPAREN");
        return argFn(arg);
      };
      if (t.type === "SIN") return fn("sin", (a) => Math.sin(toRad(a)));
      if (t.type === "COS") return fn("cos", (a) => Math.cos(toRad(a)));
      if (t.type === "TAN") return fn("tan", (a) => Math.tan(toRad(a)));
      if (t.type === "ASIN") return fn("asin", (a) => fromRad(Math.asin(a)));
      if (t.type === "ACOS") return fn("acos", (a) => fromRad(Math.acos(a)));
      if (t.type === "ATAN") return fn("atan", (a) => fromRad(Math.atan(a)));
      if (t.type === "LOG") return fn("log", (a) => Math.log10(a));
      if (t.type === "LN") return fn("ln", (a) => Math.log(a));
      if (t.type === "SQRT") return fn("sqrt", (a) => Math.sqrt(a));
      if (t.type === "ABS") return fn("abs", (a) => Math.abs(a));
      throw new Error("syntax");
    };

    const v = parseExpr();
    eat("EOF");
    return v;
  };

  const evaluateExpression = (raw) => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return 0;
    const tokens = tokenizeCalc(trimmed);
    return evaluateTokens(tokens, angleDeg);
  };

  const refreshMem = () => {
    memInd.textContent = memory !== 0 ? "M" : "";
    memInd.title = memory !== 0 ? `Memory: ${memory}` : "";
  };

  const refresh = () => {
    out.textContent = buffer.length ? buffer : "0";
  };

  const clearAll = () => {
    buffer = "";
    freshResult = false;
    refresh();
  };

  const lastChar = () => buffer[buffer.length - 1] || "";

  const needsMultiplyBefore = () => {
    const ch = lastChar();
    if (!ch) return false;
    return /[0-9.)!]/.test(ch);
  };

  const append = (piece) => {
    if (buffer === "Error") {
      buffer = "";
      freshResult = false;
    }
    if (freshResult && /[0-9.]/.test(piece[0])) buffer = "";
    freshResult = false;
    if (needsMultiplyBefore() && /^[0-9.]/.test(piece[0])) buffer += "*";
    if (piece === "(" && needsMultiplyBefore()) buffer += "*";
    if (
      (piece === "pi" ||
        piece === "e" ||
        piece.startsWith("sin") ||
        piece.startsWith("cos") ||
        piece.startsWith("tan") ||
        piece.startsWith("asin") ||
        piece.startsWith("acos") ||
        piece.startsWith("atan") ||
        piece.startsWith("sqrt") ||
        piece.startsWith("log") ||
        piece.startsWith("ln") ||
        piece.startsWith("abs")) &&
      needsMultiplyBefore()
    ) {
      buffer += "*";
    }
    buffer += piece;
    refresh();
  };

  const onDigit = (d) => {
    if (buffer === "Error") {
      buffer = "";
      freshResult = false;
    }
    if (freshResult && d !== ".") buffer = "";
    freshResult = false;
    if (d === "." && needsMultiplyBefore()) buffer += "*";
    if (d === "." && /[.]$/.test(buffer)) return;
    const ch = lastChar();
    if (d !== "." && ch === ")" && needsMultiplyBefore()) buffer += "*";
    buffer += d;
    refresh();
  };

  const evalBuffer = () => {
    try {
      const v = evaluateExpression(buffer);
      return formatResult(v);
    } catch {
      return "Error";
    }
  };

  const equals = () => {
    if (!buffer.trim()) return;
    const r = evalBuffer();
    buffer = r;
    freshResult = r !== "Error";
    refresh();
  };

  const negateDisplayed = () => {
    if (!buffer.trim()) return;
    const r = evalBuffer();
    if (r === "Error") return;
    const n = Number.parseFloat(r);
    if (!Number.isFinite(n)) return;
    buffer = formatResult(-n);
    freshResult = true;
    refresh();
  };

  const percentDisplayed = () => {
    if (!buffer.trim()) return;
    const r = evalBuffer();
    if (r === "Error") return;
    const n = Number.parseFloat(r);
    if (!Number.isFinite(n)) return;
    buffer = formatResult(n / 100);
    freshResult = true;
    refresh();
  };

  const wrapExpr = (inner) => {
    if (!buffer.trim()) return;
    const r = evalBuffer();
    if (r === "Error") return;
    buffer = inner(r);
    freshResult = true;
    refresh();
  };

  btnDeg.addEventListener("click", () => {
    angleDeg = true;
    btnDeg.classList.add("is-active");
    btnRad.classList.remove("is-active");
  });
  btnRad.addEventListener("click", () => {
    angleDeg = false;
    btnRad.classList.add("is-active");
    btnDeg.classList.remove("is-active");
  });

  f.querySelectorAll("[data-digit]").forEach((btn) => {
    btn.addEventListener("click", () => onDigit(btn.getAttribute("data-digit")));
  });
  f.querySelectorAll("[data-ins]").forEach((btn) => {
    btn.addEventListener("click", () => append(btn.getAttribute("data-ins")));
  });
  f.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-act");
      if (act === "clear") clearAll();
      else if (act === "sign") negateDisplayed();
      else if (act === "percent") percentDisplayed();
      else if (act === "equals") equals();
      else if (act === "square") wrapExpr((r) => `(${r})^2`);
      else if (act === "inv") wrapExpr((r) => `1/(${r})`);
      else if (act === "mc") {
        memory = 0;
        refreshMem();
      } else if (act === "mr") {
        const m = formatResult(memory);
        if (m === "Error") return;
        append(m);
        refreshMem();
      } else if (act === "mplus") {
        const r = evalBuffer();
        if (r === "Error") return;
        memory += Number.parseFloat(r);
        refreshMem();
      } else if (act === "mminus") {
        const r = evalBuffer();
        if (r === "Error") return;
        memory -= Number.parseFloat(r);
        refreshMem();
      } else if (act === "ms") {
        const r = evalBuffer();
        if (r === "Error") return;
        memory = Number.parseFloat(r);
        refreshMem();
      }
    });
  });

  gear.addEventListener("click", () => {
    const open = hint.hasAttribute("hidden");
    if (open) hint.removeAttribute("hidden");
    else hint.setAttribute("hidden", "");
    gear.setAttribute("aria-expanded", String(open));
  });

  const onKey = (e) => {
    if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      clearAll();
      return;
    }
    if (e.key === "Escape") {
      clearAll();
      return;
    }
    if (e.key === "Enter" || (e.key === "=" && !e.shiftKey)) {
      e.preventDefault();
      equals();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (freshResult) {
        freshResult = false;
        buffer = "";
        refresh();
        return;
      }
      buffer = buffer.slice(0, -1);
      refresh();
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      onDigit(e.key);
      return;
    }
    if (e.key === ".") {
      e.preventDefault();
      onDigit(".");
      return;
    }
    if ("+-*/^()".includes(e.key)) {
      e.preventDefault();
      append(e.key);
    }
  };

  document.addEventListener("keydown", onKey);
  refreshMem();
  refresh();
}

setupTheme();
setupLanguage();
mountBase();
setupHomeSearch();
enhanceToolCardsWithIcons();
ensureGlobalFooter();
applyBranding();

function setupLanguage() {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.classList.remove("rtl");
  document.getElementById("langSwitch")?.remove();
  applyBranding();
}

function setupHomeSearch() {
  const input = $("toolSearch");
  const allTools = $("all-tools");
  if (!input || !allTools) return;
  const cards = Array.from(allTools.querySelectorAll(".tool-link"));
  const chips = Array.from(allTools.querySelectorAll(".home-chip-row .chip"));
  let activeFilter = "all";

  const detectGroup = (card) => {
    const href = (card.getAttribute("href") || "").toLowerCase();
    const text = (card.textContent || "").toLowerCase();
    const isConverter =
      href.includes("converter") ||
      text.includes("convert") ||
      /\bto\b/.test(text) ||
      /\bjpg to\b/.test(text) ||
      /\bword to\b/.test(text);
    card.dataset.converter = isConverter ? "1" : "0";
    if (href.includes("pdf-tools/")) return "pdf";
    if (href.includes("image-tools/")) return "image";
    if (href.includes("text-tools/")) return "text";
    if (
      href.includes("generator-tools/age-calculator") ||
      href.includes("generator-tools/currency-converter") ||
      href.includes("generator-tools/calculator")
    )
      return "calculator";
    if (href.includes("generator-tools/")) return "generator";
    if (isConverter) return "converter";
    return "all";
  };

  cards.forEach((card) => {
    card.dataset.group = detectGroup(card);
  });

  const applyFilters = () => {
    const q = input.value.trim().toLowerCase();
    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      const group = card.dataset.group || "all";
      const isConverter = card.dataset.converter === "1";
      const groupMatch =
        activeFilter === "all" ||
        group === activeFilter ||
        (activeFilter === "converter" && isConverter);
      const searchMatch = !q || text.includes(q);
      card.style.display = groupMatch && searchMatch ? "" : "none";
    });
  };

  const scrollToAllTools = () => {
    allTools.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  input.addEventListener("input", applyFilters);
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter || "all";
      chips.forEach((x) => x.classList.toggle("active", x === chip));
      applyFilters();
    });
  });

  document.querySelectorAll(".js-home-nav-all").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const allChip = chips.find((c) => c.dataset.filter === "all");
      if (allChip) allChip.click();
      scrollToAllTools();
    });
  });

  document.querySelectorAll("[data-home-filter]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const f = el.dataset.homeFilter;
      if (!f) return;
      e.preventDefault();
      const chip = chips.find((c) => c.dataset.filter === f);
      if (chip) chip.click();
      scrollToAllTools();
    });
  });

  applyFilters();
}

function enhanceToolCardsWithIcons() {
  const depth = window.location.pathname.split("/").filter(Boolean).length - 1;
  const prefix = depth <= 0 ? "./" : "../".repeat(depth);
  const cards = Array.from(document.querySelectorAll(".tool-card"));
  cards.forEach((card) => {
    const nameEl = card.querySelector(".name");
    if (!nameEl) return;
    if (nameEl.querySelector(".tool-icon, .tool-icon-image")) return;
    const key = nameEl.textContent.trim().toLowerCase();
    const imagePath = TOOL_ICON_IMAGES[key];
    if (imagePath) {
      const imgEl = document.createElement("img");
      imgEl.className = "tool-icon-image";
      imgEl.setAttribute("aria-hidden", "true");
      imgEl.alt = "";
      imgEl.src = `${prefix}${imagePath}`;
      nameEl.prepend(imgEl);
      return;
    }
    const icon = TOOL_ICONS[key] || "🛠️";
    const iconEl = document.createElement("span");
    iconEl.className = "tool-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = icon;
    nameEl.prepend(iconEl);
  });
}

function ensureGlobalFooter() {
  if (document.querySelector(".site-footer")) return;
  const depth = window.location.pathname.split("/").filter(Boolean).length - 1;
  const prefix = depth <= 0 ? "./" : "../".repeat(depth);
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container footer-inner">
      <p>${BRAND_NAME} © 2026</p>
      <p>
        <a href="${prefix}about/index.html">About</a> ·
        <a href="${prefix}contact/index.html">Contact</a> ·
        <a href="${prefix}privacy-policy/index.html">Privacy Policy</a> ·
        <a href="${prefix}terms/index.html">Terms</a> ·
        <a href="${prefix}faq/index.html">FAQ</a>
      </p>
    </div>
    <div class="container legal-note">
      <p class="muted">Support: ${BRAND_EMAIL} | Follow: ${BRAND_HANDLE}</p>
    </div>`;
  document.body.appendChild(footer);
}

function applyBranding() {
  const depth = window.location.pathname.split("/").filter(Boolean).length - 1;
  const prefix = depth <= 0 ? "./" : "../".repeat(depth);
  const isDark = document.body.classList.contains("dark");
  const logoSquare = `${prefix}assets/branding/toolker-logo.png`;
  const logoWide = isDark
    ? `${prefix}assets/branding/toolker-footer-dark.png`
    : `${prefix}assets/branding/toolker-footer.png`;

  document.querySelectorAll(".brand").forEach((brand) => {
    const textSpan = brand.querySelector("span:last-child");
    if (textSpan) textSpan.textContent = BRAND_NAME;
    const mark = brand.querySelector(".brand-mark");
    if (mark) {
      mark.textContent = "TK";
      const logoImg = document.createElement("img");
      logoImg.src = logoSquare;
      logoImg.alt = `${BRAND_NAME} logo`;
      logoImg.className = "brand-logo-img";
      logoImg.onerror = () => {
        mark.textContent = "TK";
      };
      mark.textContent = "";
      mark.appendChild(logoImg);
    }
  });

  document.querySelectorAll(".footer-inner p:first-child").forEach((p) => {
    p.textContent = `${BRAND_NAME} © 2026`;
  });
  document.querySelectorAll(".legal-note .muted").forEach((p) => {
    const txt = p.textContent || "";
    if (/support:/i.test(txt) || /instagram:/i.test(txt) || /follow:/i.test(txt)) {
      p.textContent = `Support: ${BRAND_EMAIL} | Follow: ${BRAND_HANDLE}`;
    }
    if (/independent project/i.test(txt) || /quicktools hub/i.test(txt)) {
      p.textContent = `${BRAND_NAME} is an independent project and is not affiliated with any third-party tool brands.`;
    }
  });

  document.querySelectorAll(".site-footer").forEach((footer) => {
    const note = footer.querySelector(".legal-note");
    if (!note) return;
    if (!footer.querySelector(".brand-footer-logo")) {
      const wrap = document.createElement("div");
      wrap.className = "brand-footer-logo-wrap";
      wrap.innerHTML = `<img src="${logoWide}" alt="${BRAND_NAME}" class="brand-footer-logo">`;
      note.prepend(wrap);
    }
    const logoEl = footer.querySelector(".brand-footer-logo");
    if (logoEl) logoEl.src = logoWide;
  });

  if (document.title.includes("QuickTools Hub")) {
    document.title = document.title.replaceAll("QuickTools Hub", BRAND_NAME);
  }

  const cleanup = (imgEl, src) => {
    if (!imgEl || !src) return;
    makeBlackBackgroundTransparent(src)
      .then((cleanSrc) => {
        if (cleanSrc) imgEl.src = cleanSrc;
      })
      .catch(() => {});
  };
  document.querySelectorAll(".brand-logo-img").forEach((img) => cleanup(img, logoSquare));
  document.querySelectorAll(".brand-footer-logo").forEach((img) => cleanup(img, logoWide));
}

async function makeBlackBackgroundTransparent(src) {
  if (BRAND_IMAGE_CACHE.has(src)) return BRAND_IMAGE_CACHE.get(src);
  const out = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r <= 3 && g <= 3 && b <= 3) data[i + 3] = 0;
        }
        ctx.putImageData(frame, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
  BRAND_IMAGE_CACHE.set(src, out);
  return out;
}


