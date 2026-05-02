import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, acc);
    else if (ent.name === "index.html") acc.push(p);
  }
  return acc;
}

/** Place og:title, og:description, og:type immediately after canonical (before og:url block). */
function fix(html) {
  const re =
    /(<link rel="canonical" href="[^"]+">)\s*([\s\S]*?)(<script type="application\/ld\+json">[\s\S]*?<\/script>)\s*(<meta property="og:title"[^>]*>\s*<meta property="og:description"[^>]*>\s*<meta property="og:type"[^>]*>\s*)/i;
  const m = html.match(re);
  if (!m) return html;
  const [, canonical, middle, script, ogTriple] = m;
  if (!middle.includes("og:url")) return html;
  const rebuilt = `${canonical}\n  ${ogTriple.trim()}\n  ${middle.trim()}\n  ${script.trim()}\n  `;
  return html.replace(re, rebuilt);
}

let n = 0;
for (const f of walkHtml(ROOT)) {
  const html = fs.readFileSync(f, "utf8");
  const next = fix(html);
  if (next !== html) {
    fs.writeFileSync(f, next, "utf8");
    n++;
    console.log("Reordered", path.relative(ROOT, f));
  }
}
console.log("Fixed", n, "files.");
