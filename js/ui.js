import { $ } from "./dom.js";

export function showResult(message, status = "ok") {
  const r = $("result");
  if (!r) return;
  r.className = `result ${status}`;
  r.textContent = message;
}

export function setProgress(v = 0) {
  const p = $("toolProgress");
  if (p) p.value = v;
}

export function runButton(setLoading) {
  const btn = $("runTool");
  if (!btn) return;
  if (setLoading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Processing...`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.label || "Run";
  }
}
