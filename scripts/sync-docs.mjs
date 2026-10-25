#!/usr/bin/env node
// Builds the site's doc pages from crewbo/crewbo's Markdown at the commit in
// CREWBO_REF, so the site shows the same text as the repository and visitors
// stay on the site. Node's standard library only; the output is plain HTML
// committed with the site (no build step when serving).
//
//   node scripts/sync-docs.mjs          write the pages
//   node scripts/sync-docs.mjs --check  exit 1 if a page differs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const ref = readFileSync(join(here, "CREWBO_REF"), "utf8").trim();
const pages = [
  { src: "docs/user/getting-started.md", out: "getting-started.html", title: "Getting started" },
  { src: "docs/user/privacy.md", out: "privacy.html", title: "What Crewbo shares and stores" },
  { src: "docs/user/troubleshooting.md", out: "troubleshooting.html", title: "Troubleshooting" },
  { src: "CHANGELOG.md", out: "changelog.html", title: "Changelog" },
];
const onSite = new Map(pages.map((p) => [p.src, p.out]));

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-");

// href maps a Markdown link target to the site: other docs pages stay on
// the site, other repository paths go to the file at the pinned commit.
function href(target, from) {
  if (/^(https?:|mailto:|#)/.test(target)) return target;
  const [path, hash] = target.split("#");
  const full = posix.normalize(posix.join(posix.dirname(from), path));
  if (onSite.has(full)) return onSite.get(full) + (hash ? `#${hash}` : "");
  return `https://github.com/crewbo/crewbo/blob/${ref}/${full}${hash ? `#${hash}` : ""}`;
}

function inline(text, from, refs) {
  const codes = [];
  let t = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  t = t.replace(/!?\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => `<a href="${href(url, from)}">${label}</a>`);
  t = t.replace(/\[([^\]]+)\](?!\()/g, (m, label) => (refs.has(label.toLowerCase()) ? `<a href="${href(refs.get(label.toLowerCase()), from)}">${label}</a>` : m));
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

function convert(md, from) {
  const lines = md.replace(/\r/g, "").split("\n");
  const refs = new Map();
  for (const l of lines) {
    const m = l.match(/^\[([^\]]+)\]:\s*(\S+)/);
    if (m) refs.set(m[1].toLowerCase(), m[2]);
  }
  const out = [];
  let i = 0;
  let firstH1 = true;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\[[^\]]+\]:\s*\S+/.test(l) || l.trim() === "") { i++; continue; }
    const fence = l.match(/^```(\w*)/);
    if (fence) {
      const code = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      if (level === 1 && firstH1) { firstH1 = false; i++; continue; } // the page title is the template's h1
      const body = inline(h[2], from, refs);
      out.push(`<h${level} id="${slug(body)}">${body}</h${level}>`);
      i++;
      continue;
    }
    if (l.startsWith("|") && lines[i + 1] && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim(), from, refs));
      const head = cells(l);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].startsWith("|"); i++) rows.push(cells(lines[i]));
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      // Lists, nested by indentation.
      const stack = [];
      const html = [];
      for (; i < lines.length; i++) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (!m) {
          if (lines[i].trim() !== "" && /^\s{2,}\S/.test(lines[i]) && html.length) { html[html.length - 1] = html[html.length - 1].replace(/<\/li>$/, ` ${inline(lines[i].trim(), from, refs)}</li>`); continue; }
          break;
        }
        const depth = Math.floor(m[1].length / 2);
        const tag = /\d/.test(m[2]) ? "ol" : "ul";
        while (stack.length > depth + 1) html.push(`</${stack.pop()}>`);
        if (stack.length < depth + 1) {
          if (html.length && stack.length) html[html.length - 1] = html[html.length - 1].replace(/<\/li>$/, "");
          html.push(`<${tag}>`);
          stack.push(tag);
        }
        html.push(`<li>${inline(m[3], from, refs)}</li>`);
      }
      while (stack.length) { const t = stack.pop(); html.push(`</${t}>`); if (stack.length) html.push("</li>"); }
      out.push(html.join(""));
      continue;
    }
    if (l.startsWith(">")) {
      const q = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) q.push(lines[i].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inline(q.join(" "), from, refs)}</p></blockquote>`);
      continue;
    }
    const para = [];
    for (; i < lines.length && lines[i].trim() !== "" && !/^(#|```|\||>|\s*([-*]|\d+\.)\s)/.test(lines[i]); i++) para.push(lines[i].trim());
    out.push(`<p>${inline(para.join(" "), from, refs)}</p>`);
  }
  return out.join("\n");
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Crewbo</title>
<meta name="color-scheme" content="light">
<link rel="icon" href="brand/assets/png/favicon.ico" sizes="any">
<link rel="icon" href="brand/assets/svg/logo/mark-black.svg" type="image/svg+xml">
<link rel="stylesheet" href="brand/tokens/tokens.css">
<link rel="stylesheet" href="site.css">
</head>
<body class="doc-page">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <a class="brand" href="index.html" aria-label="Crewbo home"><img src="brand/assets/svg/logo/lockup-light.svg" alt="" width="120" height="30"></a>
  <div class="nav-cta">
    <a class="button small soft" href="https://github.com/crewbo/crewbo"><img src="assets/icons/github.svg" alt="" width="16" height="16">GitHub</a>
    <a class="button small primary" href="index.html#get">Get Crewbo</a>
  </div>
</header>
<main id="main" class="doc">
<p class="eyebrow">Docs</p>
<h1>${esc(title)}</h1>
<nav class="doc-nav" aria-label="Docs">${pages.map((p) => `<a href="${p.out}"${p.title === title ? ' aria-current="page"' : ""}>${esc(p.title)}</a>`).join("")}</nav>
${body}
<p class="doc-source">From <a href="https://github.com/crewbo/crewbo/blob/${ref}/${pages.find((p) => p.title === title).src}">${pages.find((p) => p.title === title).src}</a> in crewbo/crewbo.</p>
</main>
<footer>
  <div class="foot-cols">
    <div><p class="foot-h">Product</p><a href="index.html#how">How it works</a><a href="index.html#private">Privacy</a><a href="index.html#get">Get Crewbo</a><a href="index.html#works">Works with</a></div>
    <div><p class="foot-h">Resources</p>${pages.map((p) => `<a href="${p.out}">${esc(p.title === "What Crewbo shares and stores" ? "What Crewbo shares" : p.title)}</a>`).join("")}</div>
    <div><p class="foot-h">Connect</p><a href="https://github.com/crewbo/crewbo">GitHub</a><a href="https://github.com/crewbo/crewbo/issues">Report an issue</a></div>
    <div class="foot-note"><p class="foot-h">Disclaimer</p><p>*Crewbo never sends the contents of your files anywhere, and it sends no telemetry. Code moves only through your own git remote.*</p></div>
  </div>
  <a class="foot-mini" href="index.html" aria-label="Crewbo home"><img src="brand/assets/svg/logo/lockup-light.svg" alt="" width="120" height="30"></a>
</footer>
</body>
</html>
`;
}

let differs = false;
for (const p of pages) {
  const res = await fetch(`https://raw.githubusercontent.com/crewbo/crewbo/${ref}/${p.src}`);
  if (!res.ok) throw new Error(`${p.src}: ${res.status}`);
  const html = page(p.title, convert(await res.text(), p.src));
  const target = join(here, p.out);
  if (process.argv.includes("--check")) {
    if (!existsSync(target) || readFileSync(target, "utf8") !== html) { console.error(`${p.out} differs from crewbo ${ref.slice(0, 7)}`); differs = true; }
  } else {
    writeFileSync(target, html);
    console.log(`${p.out} from ${p.src}`);
  }
}
if (differs) process.exit(1);
if (process.argv.includes("--check")) console.log(`doc pages match crewbo ${ref.slice(0, 7)}`);
