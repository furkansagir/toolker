import { MAX_FILE_SIZE_MB } from "./constants.js";
import { $ } from "./dom.js";
import { showResult } from "./ui.js";

/**
 * @param {File[]} files
 * @param {string[]} types  extensions without dot, e.g. ["pdf"]
 * @param {number} [maxSizeMb]  defaults to MAX_FILE_SIZE_MB
 */
export function validateFiles(files, types, maxSizeMb = MAX_FILE_SIZE_MB) {
  if (!files.length) return "Please upload at least one file.";
  const allowed = types.map((t) => `.${t}`).join(", ");
  for (const f of files) {
    const nameParts = f.name.split(".");
    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
    const okExt = types.includes(ext);
    if (!okExt) return `Invalid file type: ${f.name}. Allowed formats: ${allowed}`;
    if (f.size > maxSizeMb * 1024 * 1024) {
      const capLabel =
        maxSizeMb >= 1024 && Number.isInteger(maxSizeMb / 1024) ? `${maxSizeMb / 1024} GB` : `${maxSizeMb} MB`;
      return `${f.name} is larger than ${capLabel}. Please upload a smaller file.`;
    }
  }
  return "";
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke a bit later so multi-file downloads are not cut off.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * @param {string} id  container element id (innerHTML replaced)
 * @param {string} accept  input accept attribute
 * @param {boolean} [multiple]
 */
export function initUploader(id, accept, multiple = true) {
  const root = $(id);
  // Native <label for> makes the whole drop area (including file name) open the picker in one click.
  root.innerHTML = `
    <label class="uploader" id="${id}Drop" for="${id}Input" aria-label="Drop files here or click to choose files">
      <span class="uploader__prompt">Drop files here or click to upload</span>
      <span id="${id}List" class="uploader__files muted" aria-live="polite"></span>
    </label>
    <input id="${id}Input" class="sr-only" type="file" accept="${accept}" ${multiple ? "multiple" : ""} tabindex="-1" />`;
  const drop = $(`${id}Drop`);
  const input = $(`${id}Input`);
  const list = $(`${id}List`);
  const allowedExts = (accept || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.startsWith("."));
  const enforceAcceptedFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!allowedExts.length) return files;
    const accepted = [];
    const rejected = [];
    files.forEach((file) => {
      const parts = file.name.split(".");
      const rawExt = parts.length > 1 ? parts.pop() : "";
      const ext = `.${(rawExt || "").toLowerCase()}`;
      if (allowedExts.includes(ext)) accepted.push(file);
      else rejected.push(file.name);
    });
    if (rejected.length) {
      const allowedLabel = allowedExts.join(", ");
      showResult(`Invalid file type: ${rejected.join(", ")}. Allowed formats: ${allowedLabel}`, "error");
    }
    return multiple ? accepted : accepted.slice(0, 1);
  };
  const applyFilesToInput = (fileList) => {
    const filtered = enforceAcceptedFiles(fileList);
    const dt = new DataTransfer();
    filtered.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    render();
    input.dispatchEvent(new Event("change"));
  };
  const render = () => {
    const files = Array.from(input.files || []);
    list.textContent = files.length
      ? files.map((f, i) => `${i + 1}. ${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(" | ")
      : "No files selected";
  };
  drop.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (!next || !drop.contains(next)) drop.classList.remove("dragover");
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.remove("dragover");
    applyFilesToInput(e.dataTransfer.files);
  });
  input.addEventListener("change", () => {
    const filtered = enforceAcceptedFiles(input.files);
    const dt = new DataTransfer();
    filtered.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    render();
  });
  render();
  return input;
}

export async function imgToCanvas(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = url;
  });
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return c;
}
