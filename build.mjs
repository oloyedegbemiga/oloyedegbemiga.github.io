#!/usr/bin/env node
// Turns the Obsidian vault in ./vault into a static website in ./site.
//
//   npm run build        build once
//   npm run dev          build, serve on http://localhost:4000 and rebuild on save
//
// Folders listed in site.config.json "sections" (projects, skills, notes) become
// sections of the site and nodes in the graph. Notes at the vault root become
// standalone pages (index.md = homepage, about.md, graph.md). Anything in a
// folder starting with "_" or "." (templates, .obsidian) is ignored, and any note
// with `draft: true` or `publish: false` in its properties is skipped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";
import katex from "katex";
import * as T from "./src/templates.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const VAULT = path.join(ROOT, "vault");
const OUT = path.join(ROOT, "site");

// LINK_INDEX=1 makes links point at ".../index.html", for hosts that don't
// serve folder URLs (or opening the files straight from disk).
const LINK_INDEX = process.env.LINK_INDEX === "1";

const IMAGE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;
const MODEL = /\.(glb|gltf)$/i;

// ---------- small helpers ----------

export const slugify = (s) =>
  String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const esc = T.esc;

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("_")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const formatDate = (d) => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date) ? String(d) : date.toISOString().slice(0, 10);
};

/** Splits "[[target#heading|alias]]" contents into parts. */
function parseWiki(inner) {
  const [target, ...rest] = inner.split("|");
  const [file, heading] = target.split("#");
  return { file: file.trim(), heading: heading?.trim(), alias: rest.join("|").trim() };
}

/** Pulls every [[link]] out of a front-matter value (strings, lists, nested objects). */
function wikiInValue(v, out = []) {
  if (typeof v === "string") for (const m of v.matchAll(/!?\[\[([^\]\n]+?)\]\]/g)) out.push(parseWiki(m[1]));
  else if (Array.isArray(v)) v.forEach((x) => wikiInValue(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => wikiInValue(x, out));
  return out;
}

// ---------- build ----------

export function build() {
  const t0 = Date.now();
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
  const sectionFolders = new Set(config.sections.map((s) => s.folder));

  // 1. Read the vault
  const notes = [];
  const assets = new Map(); // lower-case file name -> vault-relative path
  for (const file of walk(VAULT)) {
    const rel = path.relative(VAULT, file).split(path.sep).join("/");
    if (!rel.endsWith(".md")) {
      assets.set(path.basename(rel).toLowerCase(), rel);
      continue;
    }
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    if (data.draft === true || data.publish === false) continue;
    const name = path.basename(rel, ".md");
    const dirs = rel.split("/").slice(0, -1);
    const folder = dirs[0] || "";
    const url = dirs.length
      ? [...dirs.map(slugify), slugify(name)].join("/") + "/"
      : name.toLowerCase() === "index" ? "" : slugify(name) + "/";
    notes.push({
      name, rel, url, data, content,
      type: sectionFolders.has(folder) ? folder : "page",
      title: data.title || name,
      out: new Set(), back: new Set(),
    });
  }

  // 2. Lookups so [[links]] resolve the way Obsidian does (by file name, case-insensitive)
  const byName = new Map(), byPath = new Map();
  for (const n of notes) {
    byPath.set(n.rel.replace(/\.md$/, "").toLowerCase(), n);
    if (!byName.has(n.name.toLowerCase())) byName.set(n.name.toLowerCase(), n);
    for (const a of [].concat(n.data.aliases || [])) byName.set(String(a).toLowerCase(), n);
  }
  const findNote = (target) => {
    const t = target.trim().replace(/\.md$/i, "").toLowerCase();
    return t ? byPath.get(t) || byName.get(t) || byName.get(t.split("/").pop()) : null;
  };
  const findAsset = (target) => assets.get(path.basename(String(target).trim()).toLowerCase());

  // 3. Collect links (body + properties) for backlinks and the graph
  const stripCode = (s) => s.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g, "");
  for (const n of notes) {
    const refs = [...stripCode(n.content).matchAll(/(?<!!)\[\[([^\]\n]+?)\]\]/g)].map((m) => parseWiki(m[1]));
    refs.push(...wikiInValue(n.data));
    for (const r of refs) {
      const target = findNote(r.file);
      if (target && target !== n) { n.out.add(target); target.back.add(n); }
    }
  }

  // 4. URL helpers. All links are relative, so the site works at any address:
  //    username.github.io, username.github.io/repo/ or a custom domain.
  const ctxFor = (pagePath) => {
    const depth = pagePath.split("/").filter(Boolean).length;
    const up = "../".repeat(depth);
    const href = (target = "") => {
      let h = up + target;
      if (LINK_INDEX && (h === "" || h.endsWith("/"))) h += "index.html";
      return h || "./";
    };
    return {
      path: pagePath,
      root: up,
      href,
      note: (n, heading) => href(n.url) + (heading ? "#" + slugify(heading) : ""),
      asset: (rel) => up + rel.split("/").map(encodeURIComponent).join("/"),
    };
  };

  // 5. Markdown rendering with Obsidian syntax
  let ctx; // context of the page currently being rendered
  let usesModel = false, usesMath = false, usesMermaid = false;

  const embed = ({ file, alias }) => {
    const rel = findAsset(file);
    if (rel) {
      const src = ctx.asset(rel);
      const caption = alias && !/^\d+(x\d+)?$/.test(alias) ? alias : "";
      const width = /^\d+/.test(alias || "") ? ` width="${parseInt(alias)}"` : "";
      let media;
      if (IMAGE.test(rel)) media = `<img src="${src}" alt="${esc(caption || file)}"${width} loading="lazy">`;
      else if (VIDEO.test(rel)) media = `<video src="${src}" controls playsinline muted loop preload="metadata"></video>`;
      else if (MODEL.test(rel)) { usesModel = true; media = T.modelViewer(src, caption || file); }
      else return `<a class="file-link" href="${src}">${esc(alias || file)}</a>`;
      return caption ? `<figure class="embed">${media}<figcaption>${esc(caption)}</figcaption></figure>` : media;
    }
    const note = findNote(file);
    if (note) return `<a class="embed-note" href="${ctx.note(note)}">${esc(note.title)} →</a>`;
    return `<span class="unresolved">${esc(file)}</span>`;
  };

  const wikilink = ({ file, heading, alias }) => {
    const note = findNote(file);
    const text = esc(alias || (heading ? `${file} › ${heading}` : file));
    if (note) return `<a class="internal" href="${ctx.note(note, heading)}">${text}</a>`;
    if (!file && heading) return `<a class="internal" href="#${slugify(heading)}">${text}</a>`;
    const rel = findAsset(file);
    if (rel) return `<a class="file-link" href="${ctx.asset(rel)}">${text}</a>`;
    return `<span class="unresolved" title="Not published yet">${text}</span>`;
  };

  // LaTeX: $...$ inline and $$...$$ display, rendered to HTML at build time.
  // Rendered math is parked behind a placeholder so markdown can't mangle it.
  let mathParts = [];
  const mathHtml = (tex, displayMode) => {
    usesMath = true;
    let html;
    try { html = katex.renderToString(tex, { displayMode, throwOnError: false, output: "htmlAndMathml" }); }
    catch (e) { html = `<code class="math-error">${esc(tex)}</code>`; }
    mathParts.push(displayMode ? `<div class="math-display">${html}</div>` : html);
    return `\uE000${displayMode ? "D" : "I"}${mathParts.length - 1}\uE001`;
  };
  const withMath = (text) =>
    text
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => mathHtml(t.trim(), true))
      .replace(/(?<![\\$])\$(?![\s$])([^$\n]+?)(?<![\s\\])\$(?![\d$])/g, (_, t) => mathHtml(t, false));
  const restoreMath = (html) =>
    html
      .replace(/<p>\s*(\uE000D\d+\uE001)\s*<\/p>/g, "$1") // display math isn't a paragraph
      .replace(/\uE000[DI](\d+)\uE001/g, (_, i) => mathParts[+i]);

  const obsidianSyntax = (src) =>
    src
      .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g)
      .map((part, i) =>
        i % 2 ? part : withMath(part)
          .replace(/%%[\s\S]*?%%/g, "") // Obsidian comments
          .replace(/!\[\[([^\]\n]+?)\]\]/g, (_, inner) => embed(parseWiki(inner)))
          .replace(/\[\[([^\]\n]+?)\]\]/g, (_, inner) => wikilink(parseWiki(inner)))
          .replace(/==([^=\n]+)==/g, "<mark>$1</mark>"))
      .join("");

  const isLocal = (href) => href && !/^([a-z]+:|\/\/|#|\/)/i.test(href);
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }) {
        if ((lang || "").trim().toLowerCase() === "mermaid") {
          usesMermaid = true;
          return `<pre class="mermaid" data-source="${esc(text)}">${esc(text)}</pre>\n`;
        }
        const l = (lang || "").trim().split(/\s/)[0];
        return `<pre><code${l ? ` class="language-${esc(l)}"` : ""}>${esc(text)}\n</code></pre>\n`;
      },
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${slugify(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      image({ href, title, text }) {
        // Standard markdown image: ![alt](attachments/photo.jpg)
        const rel = isLocal(href) && findAsset(decodeURI(href));
        if (rel && MODEL.test(rel)) { usesModel = true; return T.modelViewer(ctx.asset(rel), text); }
        const src = rel ? ctx.asset(rel) : href;
        return `<img src="${esc(src)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        let target = href, cls = "";
        if (isLocal(href)) {
          const [file, hash] = decodeURI(href).split("#");
          const note = findNote(file);
          const rel = !note && findAsset(file);
          if (note) { target = ctx.note(note, hash); cls = "internal"; }
          else if (rel) target = ctx.asset(rel);
        } else if (/^https?:/.test(href)) cls = "external";
        return `<a href="${esc(target)}"${cls ? ` class="${cls}"` : ""}${title ? ` title="${esc(title)}"` : ""}${cls === "external" ? ' rel="noopener"' : ""}>${inner}</a>`;
      },
    },
  });

  const callouts = (html) =>
    html.replace(
      /<blockquote>\s*<p>\[!(\w+)\][+-]?[ \t]*([^\n<]*)\n?([\s\S]*?)<\/blockquote>/g,
      (_, type, title, rest) =>
        `<aside class="callout" data-callout="${type.toLowerCase()}"><div class="callout-title">${title.trim() || type[0].toUpperCase() + type.slice(1).toLowerCase()}</div><div class="callout-body"><p>${rest}</div></aside>`
    ).replace(/<p>\s*<\/p>/g, "");

  const md = (src) => restoreMath(callouts(marked.parse(obsidianSyntax(src || ""))));

  // Front-matter helpers
  const fmLinks = (v) => wikiInValue(v).map((r) => ({ note: findNote(r.file), text: r.alias || r.file }));
  const fmMedia = (v) => {
    if (!v || typeof v !== "string") return null;
    const m = v.match(/^\s*!?\[\[([^\]]+)\]\]\s*$/);
    const { file, alias } = m ? parseWiki(m[1]) : { file: v.trim(), alias: "" };
    if (/^https?:\/\//.test(file)) return { url: file, file, alias };
    const rel = findAsset(file);
    return rel ? { url: ctx.asset(rel), rel, file, alias } : null;
  };
  const fmGallery = (v) =>
    [].concat(v || []).filter(Boolean).map((item) => {
      const m = String(item).match(/^\s*!?\[\[([^\]]+)\]\]\s*$/);
      const { file, alias } = m ? parseWiki(m[1]) : { file: String(item).split(" | ")[0], alias: String(item).split(" | ")[1] || "" };
      const rel = findAsset(file);
      return rel ? { url: ctx.asset(rel), rel, caption: alias } : null;
    }).filter(Boolean);

  // 6. Sorting and grouping
  const inSection = (folder) => notes.filter((n) => n.type === folder);
  const projects = inSection("projects").sort((a, b) =>
    (a.data.order ?? 999) - (b.data.order ?? 999) || (b.data.year ?? 0) - (a.data.year ?? 0) || a.title.localeCompare(b.title));
  const skills = inSection("skills").sort((a, b) =>
    [...b.back].filter((x) => x.type === "projects").length - [...a.back].filter((x) => x.type === "projects").length || a.title.localeCompare(b.title));
  const notesList = inSection("notes").sort((a, b) => formatDate(b.data.date).localeCompare(formatDate(a.data.date)));
  const sorted = { projects, skills, notes: notesList };
  const listFor = (folder) => sorted[folder] || inSection(folder).sort((a, b) => a.title.localeCompare(b.title));

  const special = (name) => notes.find((n) => n.type === "page" && n.name.toLowerCase() === name);
  const nav = [
    ...config.sections.map((s) => ({ href: s.folder + "/", label: s.title, key: s.folder })),
    ...(special("graph") ? [{ href: "graph/", label: "Graph", key: "graph" }] : []),
    ...(special("about") ? [{ href: "about/", label: "About", key: "about" }] : []),
  ];

  // 7. Write pages
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const write = (pagePath, html) => {
    const file = path.join(OUT, pagePath, "index.html");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  };
  const page = (pagePath, opts) => {
    const scripts = [];
    if (opts.graph) scripts.push(
      `<script src="${ctx.root}vendor/force-graph.min.js"></script>`,
      `<script src="${ctx.root}assets/graph-data.js"></script>`,
      `<script src="${ctx.root}assets/graph.js"></script>`);
    // The prompt runs on every page: full screen on the homepage, a bar at the bottom elsewhere
    scripts.push(
      `<script src="${ctx.root}assets/site-index.js"></script>`,
      `<script src="${ctx.root}assets/console.js"></script>`);
    if (usesMermaid) scripts.push(
      `<script src="${ctx.root}vendor/mermaid.min.js"></script>`,
      `<script src="${ctx.root}assets/diagrams.js"></script>`);
    if (usesModel) scripts.push(`<script type="module" src="${ctx.root}vendor/model-viewer.min.js"></script>`);
    let html = T.layout({ site: config, ctx, nav, scripts: scripts.join("\n"), ...opts });
    if (usesMath) html = html.replace("</head>", `<link rel="stylesheet" href="${ctx.root}vendor/katex/katex.min.css">\n</head>`);
    write(pagePath, html);
  };
  const graphNode = (n) => sectionFolders.has(n.type);
  const card = (n) => ({ note: n, href: ctx.note(n), cover: fmMedia(n.data.cover), skills: fmLinks(n.data.skills).map((s) => s.text) });

  // Homepage: the terminal
  {
    const home = special("index");
    ctx = ctxFor(""); usesModel = usesMath = usesMermaid = false;
    const has = (name) => !!special(name);
    const commands = [
      ...config.sections.map((s) => ({ cmd: s.folder, desc: s.command || s.title.toLowerCase(), href: s.folder + "/" })),
      ...(has("graph") ? [{ cmd: "graph", desc: "how it connects", href: "graph/" }] : []),
      ...(has("about") ? [{ cmd: "about", desc: "about me", href: "about/" }] : []),
      { cmd: "contact", desc: "get in touch", href: has("about") ? "about/" : "" },
      { cmd: "light / dark", desc: "switch themes", href: "" },
      { cmd: "clear", desc: "reset terminal", href: "" },
    ];
    page("", {
      title: config.title,
      description: config.description,
      bodyClass: "home",
      mainClass: "",
      dock: false,
      graph: notes.some(graphNode),
      body: T.home({ ctx, intro: md(home?.content), name: config.name, commands }),
    });
  }

  // Section index pages
  for (const s of config.sections) {
    ctx = ctxFor(s.folder + "/"); usesModel = usesMath = usesMermaid = false;
    const items = listFor(s.folder);
    page(s.folder + "/", {
      title: `${s.title} · ${config.name}`,
      description: s.intro || config.description,
      current: s.folder,
      body: T.sectionIndex({ ctx, section: s, items, cards: s.folder === "projects" ? items.map(card) : null }),
    });
  }

  // Note pages
  for (const n of notes) {
    if (n.type === "page" && ["index"].includes(n.name.toLowerCase())) continue;
    ctx = ctxFor(n.url); usesModel = usesMath = usesMermaid = false;
    const html = md(n.content);
    const section = config.sections.find((s) => s.folder === n.type);
    const list = section ? listFor(n.type) : [];
    const i = list.indexOf(n);
    const common = {
      ctx, note: n, html, section,
      back: [...n.back].filter((b) => b.type !== "page").sort((a, b) => a.title.localeCompare(b.title)),
      inGraph: graphNode(n),
      prev: i > 0 ? list[i - 1] : null,
      next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
      date: formatDate(n.data.date),
    };
    let body;
    if (n.type === "projects") {
      const model = fmMedia(n.data.model);
      if (model) usesModel = true;
      body = T.project({
        ...common,
        cover: fmMedia(n.data.cover),
        video: fmMedia(n.data.video),
        model,
        gallery: fmGallery(n.data.gallery),
        skills: fmLinks(n.data.skills),
      });
    } else if (n.type === "skills") {
      body = T.skill({ ...common, projects: [...n.back].filter((b) => b.type === "projects").map(card) });
    } else if (n.name.toLowerCase() === "graph") {
      body = T.graphPage({ ...common, sections: config.sections });
    } else {
      body = T.note({ ...common, resume: fmMedia(n.data.resume) });
    }
    page(n.url, {
      title: `${n.title} · ${config.name}`,
      description: n.data.summary || n.data.description || config.description,
      current: section ? n.type : n.name.toLowerCase(),
      graph: common.inGraph || n.name.toLowerCase() === "graph",
      body,
    });
  }

  // 8. Graph data, static assets and vendor libraries
  const graph = {
    nodes: notes.filter(graphNode).map((n) => ({ id: n.url, title: n.title, type: n.type, url: n.url })),
    links: notes.filter(graphNode).flatMap((n) => [...n.out].filter(graphNode).map((t) => ({ source: n.url, target: t.url }))),
  };
  const seen = new Set();
  graph.links = graph.links.filter((l) => {
    const k = [l.source, l.target].sort().join("|");
    return !seen.has(k) && seen.add(k);
  });
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "assets/graph-data.js"),
    `window.GRAPH = ${JSON.stringify(graph)};\nwindow.LINK_INDEX = ${LINK_INDEX};\n`);
  // Everything the prompt can list or open. Paths are relative to the site root.
  ctx = ctxFor(""); usesModel = usesMath = usesMermaid = false;
  const fmCover = (v) => { const m = fmMedia(v); return m && m.rel ? m.rel.split("/").map(encodeURIComponent).join("/") : ""; };
  const aboutNote = special("about");
  const aboutForPrompt = aboutNote ? { html: md(aboutNote.content), resume: fmCover(aboutNote.data.resume) } : null;
  // Order lists the same way as the section pages
  const order = new Map(Object.values(sorted).flat().map((n, i) => [n.url, i]));
  notes.sort((a, b) => (order.get(a.url) ?? 1e9) - (order.get(b.url) ?? 1e9));
  const siteIndex = {
    name: config.name,
    links: config.links || {},
    sections: config.sections.map((s) => ({ folder: s.folder, title: s.title, intro: s.intro || "", command: s.command || "" })),
    pages: notes.filter((n) => n.url).map((n) => {
      const cover = fmCover(n.data.cover);
      return {
        title: n.title, url: n.url, type: n.type, name: n.name,
        summary: n.data.summary || "", year: n.data.year || "", date: formatDate(n.data.date),
        aliases: [].concat(n.data.aliases || []).map(String),
        cover, featured: !!n.data.featured, level: n.data.level || "",
        stack: fmLinks(n.data.skills).map((x) => x.text),
        projects: [...n.back].filter((b) => b.type === "projects").length,
      };
    }),
    about: aboutForPrompt,
    linkIndex: LINK_INDEX,
  };
  fs.writeFileSync(path.join(OUT, "assets/site-index.js"), `window.SITE = ${JSON.stringify(siteIndex)};\n`);
  for (const f of fs.readdirSync(path.join(ROOT, "src")))
    if (/\.(css|js)$/.test(f)) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, "assets", f));

  fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "node_modules/force-graph/dist/force-graph.min.js"), path.join(OUT, "vendor/force-graph.min.js"));
  fs.copyFileSync(path.join(ROOT, "node_modules/@google/model-viewer/dist/model-viewer.min.js"), path.join(OUT, "vendor/model-viewer.min.js"));
  fs.copyFileSync(path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js"), path.join(OUT, "vendor/mermaid.min.js"));
  fs.cpSync(path.join(ROOT, "node_modules/katex/dist/fonts"), path.join(OUT, "vendor/katex/fonts"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "node_modules/katex/dist/katex.min.css"), path.join(OUT, "vendor/katex/katex.min.css"));
  // IBM Plex Mono, served with the site (no Google Fonts request)
  fs.mkdirSync(path.join(OUT, "vendor/fonts"), { recursive: true });
  for (const f of ["400-normal", "500-normal", "600-normal", "400-italic"])
    fs.copyFileSync(path.join(ROOT, `node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${f}.woff2`), path.join(OUT, `vendor/fonts/plex-mono-${f}.woff2`));

  for (const rel of assets.values()) {
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(VAULT, rel), dest);
  }
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

  console.log(`Built ${notes.length} notes, ${assets.size} files → site/ in ${Date.now() - t0} ms`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) build();
