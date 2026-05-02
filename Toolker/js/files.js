import { MAX_FILE_SIZE_MB } from "./constants.js";
import { $ } from "./dom.js";
import { showResult } from "./ui.js";

export function validateFiles(files, types) {
  if (!files.length) return "Please upload at least one file.";
  const allowed = types.map((t) => `.${t}`).join(", ");
  for (const f of files) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!types.includes(ext)) return `Invalid file type: ${f.name}. Allowed formats: ${allowed}`;
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `${f.name} is larger than ${MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`;
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

export function initUploader(id, accept, multiple = true) {
  const root = $(id);
  root.innerHTML = `
    <div class="uploader" id="${id}Drop">Drop files here or click to upload</div>
    <input id="${id}Input" type="file" accept="${accept}" ${multiple ? "multiple" : ""} hidden />
    <div id="${id}List" class="muted"></div>`;
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
      const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
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
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
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
