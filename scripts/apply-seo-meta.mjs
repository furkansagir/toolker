/**
 * One-off / maintenance: add canonical, social meta, WebPage + BreadcrumbList JSON-LD
 * to HTML files that do not already have rel="canonical".
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = "https://www.toolker.com";
const OG_IMAGE = `${BASE}/assets/branding/toolker-footer.png`;

const HUB_LABEL = {
  "pdf-tools": "PDF tools",
  "image-tools": "Image tools",
  "text-tools": "Text tools",
  "generator-tools": "Generator tools",
};

const STATIC_LABEL = {
  about: "About",
  contact: "Contact",
  faq: "FAQ",
  "privacy-policy": "Privacy Policy",
  terms: "Terms",
};

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, acc);
    else if (ent.name === "index.html") acc.push(p);
  }
  return acc;
}

function canonicalUrl(filePath) {
  let rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  rel = rel.replace(/\/index\.html$/i, "");
  if (!rel) return `${BASE}/`;
  return `${BASE}/${rel}/`;
}

function escAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function getTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, "&") : "Toolker";
}

function getDescription(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? m[1].replace(/&amp;/g, "&") : "";
}

function titleForOg(rawTitle) {
  const t = rawTitle.trim();
  if (/\|\s*Toolker\s*$/i.test(t)) return t;
  if (t.includes("|")) return t;
  return `${t} | Toolker`;
}

function breadcrumbItems(filePath, pageTitle) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/").replace(/\/index\.html$/i, "");
  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const out = [{ name: "Home", url: `${BASE}/` }];

  const hub = parts[0];
  if (HUB_LABEL[hub]) {
    out.push({ name: HUB_LABEL[hub], url: `${BASE}/${hub}/` });
    if (parts.length === 1) return out;

    const sub = parts.slice(1).join("/");
    const short = pageTitle.split("|")[0].trim();
    out.push({ name: short, url: `${BASE}/${hub}/${sub}/` });
    return out;
  }

  if (STATIC_LABEL[hub] && parts.length === 1) {
    out.push({ name: STATIC_LABEL[hub], url: `${BASE}/${hub}/` });
    return out;
  }

  return null;
}

function buildLdJson(canonical, name, description, crumbs) {
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name,
      description,
      isPartOf: { "@type": "WebSite", name: "Toolker", url: `${BASE}/` },
    },
  ];
  if (crumbs && crumbs.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function patchFile(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  if (html.includes('rel="canonical"')) return false;

  const canonical = canonicalUrl(filePath);
  const rawTitle = getTitle(html);
  const description = getDescription(html);
  const ogTitle = titleForOg(rawTitle);
  const crumbs = breadcrumbItems(filePath, rawTitle);
  const ld = crumbs ? buildLdJson(canonical, rawTitle, description, crumbs) : null;

  const hasOgTitle = /property="og:title"/i.test(html);
  const hasTwitter = /name="twitter:card"/i.test(html);

  let insert = `
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">`;

  if (!hasOgTitle) {
    insert += `
  <meta property="og:title" content="${escAttr(ogTitle)}">
  <meta property="og:description" content="${escAttr(description)}">
  <meta property="og:type" content="website">`;
  }

  insert += `
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Toolker">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${OG_IMAGE}">`;

  if (!hasTwitter) {
    insert += `
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(ogTitle)}">
  <meta name="twitter:description" content="${escAttr(description)}">
  <meta name="twitter:image" content="${OG_IMAGE}">`;
  }

  if (ld) {
    insert += `
  <script type="application/ld+json">${ld.replace(/</g, "\\u003c")}</script>`;
  }

  const replaced = html.replace(/(<meta\s+name="description"\s+content="[^"]*"\s*>)/i, `$1${insert}`);
  if (replaced === html) {
    console.warn("No description meta to anchor insert:", filePath);
    return false;
  }
  fs.writeFileSync(filePath, replaced, "utf8");
  return true;
}

const files = walkHtml(ROOT).filter((f) => !f.includes("node_modules"));
let n = 0;
for (const f of files) {
  if (patchFile(f)) {
    n++;
    console.log("Updated", path.relative(ROOT, f));
  }
}
console.log("Done. Patched", n, "files.");
