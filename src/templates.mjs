// HTML templates. Edit these to change the structure of each kind of page.
// `ctx.href("projects/")` makes a link relative to the current page,
// `ctx.note(note)` links to a note, and `ctx.root` is the path back to the site root.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const favicon =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#181923"/><rect x="18" y="8" width="6" height="16" fill="#e4d196"/><path d="M8 10l5 6-5 6" stroke="#a19876" stroke-width="2.5" fill="none"/></svg>`);

export function layout({ site, ctx, nav, title, description, body, bodyClass = "", mainClass = "wrap", current = "", scripts = "", dock = true }) {
  const absolute = site.url ? site.url.replace(/\/$/, "") + "/" + ctx.path : "";
  const image = site.url && site.socialImage ? site.url.replace(/\/$/, "") + "/" + site.socialImage.replace(/^\//, "") : "";
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${absolute ? `<meta property="og:url" content="${esc(absolute)}">\n<link rel="canonical" href="${esc(absolute)}">` : ""}
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="icon" href="${favicon}">
<link rel="preload" href="${ctx.root}vendor/fonts/plex-mono-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.root}assets/style.css">
<script>try{document.documentElement.dataset.theme=localStorage.getItem("theme")||"dark"}catch(e){}</script>
</head>
<body class="${bodyClass}${dock ? " has-dock" : ""}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${ctx.href("")}"><span class="dot" aria-hidden="true">›</span>${esc(site.name)}</a>
    <nav aria-label="Main">
      ${nav.map((n) => `<a href="${ctx.href(n.href)}"${n.key === current ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("\n      ")}
      <button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch light or dark theme">light / dark</button>
    </nav>
  </div>
</header>
<main id="main" class="${mainClass}">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <span>© ${new Date().getFullYear()} ${esc(site.name)}</span>
    <span class="footer-links">${Object.entries(site.links || {}).map(([label, url]) => `<a href="${esc(url)}" rel="me noopener">${esc(label)}</a>`).join("")}</span>
  </div>
</footer>
${dock ? dockBar(ctx) : ""}
${scripts}
</body>
</html>
`;
}

// ---------- pieces ----------

const label = (text) => `<h2 class="label">${esc(text)}</h2>`;

export const modelViewer = (src, alt) =>
  `<model-viewer src="${src}" alt="${esc(alt)}" camera-controls auto-rotate auto-rotate-delay="1500" rotation-per-second="18deg" interaction-prompt="none" shadow-intensity="0.8" exposure="1.05" touch-action="pan-y"></model-viewer>`;

const cardHtml = ({ note, href, cover, skills }) => `
<a class="card" href="${href}">
  <div class="card-media">${cover && /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(cover.url) ? `<img src="${cover.url}" alt="" loading="lazy">` : ""}</div>
  <div class="card-body">
    <h3>${esc(note.title)}</h3>
    ${note.data.summary ? `<p>${esc(note.data.summary)}</p>` : ""}
    <p class="meta">${[note.data.year, skills.slice(0, 3).join(", ")].filter(Boolean).map(esc).join(" · ")}</p>
  </div>
</a>`;

const row = (href, title, right = "", sub = "") => `
<li><a href="${href}"><span class="row-title">${esc(title)}${sub ? `<span class="row-sub">${esc(sub)}</span>` : ""}</span><span class="row-right">${esc(right)}</span></a></li>`;

const graphBox = (ctx, { focus = "", cls = "", interactive = false } = {}) =>
  `<div class="graph ${cls}" data-graph data-root="${ctx.root}"${focus ? ` data-focus="${esc(focus)}"` : ""}${interactive ? " data-interactive" : ""} role="img" aria-label="Graph of linked pages"></div>`;

const connections = ({ ctx, note, back, inGraph }) => {
  if (!inGraph && !back.length) return "";
  return `
<section class="connections">
  ${label("Connections")}
  <div class="connections-grid">
    ${inGraph ? graphBox(ctx, { focus: note.url, cls: "graph--local" }) : ""}
    ${back.length ? `<div><p class="small-label">Linked from</p><ul class="link-list">${back.map((b) => `<li><a href="${ctx.note(b)}">${esc(b.title)}</a></li>`).join("")}</ul></div>` : ""}
  </div>
</section>`;
};

const pager = ({ ctx, prev, next }) =>
  prev || next
    ? `<nav class="pager" aria-label="More">
  ${prev ? `<a class="prev" href="${ctx.note(prev)}"><span class="small-label">Previous</span>${esc(prev.title)}</a>` : "<span></span>"}
  ${next ? `<a class="next" href="${ctx.note(next)}"><span class="small-label">Next</span>${esc(next.title)}</a>` : "<span></span>"}
</nav>`
    : "";

const backLink = (ctx, section) =>
  section ? `<a class="back" href="${ctx.href(section.folder + "/")}">← All ${esc(section.title.toLowerCase())}</a>` : "";

const chips = (items, ctx) =>
  `<span class="chips">${items.map((s) => (s.note ? `<a class="chip" href="${ctx.note(s.note)}">${esc(s.text)}</a>` : `<span class="chip">${esc(s.text)}</span>`)).join("")}</span>`;

// ---------- pages ----------

// ---------- prompt pieces (used by src/console.js) ----------

const promptLine = (placeholder) => `
  <form class="term-line" autocomplete="off" hidden>
    <span class="ps" aria-hidden="true">›</span>
    <div class="term-field">
      <input name="cmd" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" enterkeyhint="go"
        placeholder="${esc(placeholder)}" aria-label="Command" role="combobox" aria-expanded="false" aria-autocomplete="list">
      <span class="cursor" aria-hidden="true"></span>
      <span class="mirror" aria-hidden="true"></span>
    </div>
    <ul class="sug" role="listbox" hidden></ul>
  </form>`;

const cmdLink = (ctx, cmd, desc, href) =>
  `<a class="cmd" href="${ctx.href(href)}" data-run="${esc(cmd)}"><b>${esc(cmd)}</b><span>- ${esc(desc)}</span></a>`;

// Prompt bar fixed to the bottom of inner pages
function dockBar(ctx) {
  return `
<div class="dock" data-console data-mode="dock" data-root="${ctx.root}">
  <div class="wrap">
    ${promptLine("type a command: projects, about, help…")}
    <span class="dock-msg" aria-live="polite"></span>
    <nav class="dock-cmds" aria-label="Commands">
      <button type="button" class="cmd" data-run="esc"><b>Esc</b><span>- back</span></button>
      <button type="button" class="cmd" data-run="help"><b>help</b><span>- all commands</span></button>
    </nav>
  </div>
</div>`;
}

// The homepage is a full-screen terminal. The intro and the command links are
// rendered here so they work without JavaScript; src/console.js adds the prompt.
export function home({ ctx, intro, name, commands }) {
  return `
<div class="term" data-console data-mode="home" data-root="${ctx.root}">
  <div class="term-out">
    <div class="term-log" aria-live="polite">
      <section class="block intro">
        <h1 class="block-title">${esc(name)}</h1>
        <div class="intro-body">${intro}</div>
      </section>
    </div>
  </div>
  <div class="term-dock">
    ${promptLine("type a command, or a project name…")}
    <div class="term-help">
      <p class="term-help-title">Type <code>help</code> for commands, or try:</p>
      <nav class="grid" aria-label="Commands">
        ${commands.map((c) => cmdLink(ctx, c.cmd, c.desc, c.href)).join("\n        ")}
      </nav>
    </div>
  </div>
</div>`;
}

export function sectionIndex({ ctx, section, items, cards }) {
  let list;
  if (cards) list = `<div class="cards">${cards.map(cardHtml).join("")}</div>`;
  else if (section.folder === "skills")
    list = `<ul class="rows">${items.map((s) => {
      const count = [...s.back].filter((b) => b.type === "projects").length;
      return row(ctx.note(s), s.title, count ? `${count} project${count > 1 ? "s" : ""}` : "", s.data.summary);
    }).join("")}</ul>`;
  else
    list = `<ul class="rows">${items.map((n) => row(ctx.note(n), n.title, n.data.date ? new Date(n.data.date).toISOString().slice(0, 10) : "", n.data.summary)).join("")}</ul>`;
  return `
<header class="page-head">
  <h1>${esc(section.title)}</h1>
  ${section.intro ? `<p class="lede">${esc(section.intro)}</p>` : ""}
</header>
${items.length ? list : `<p class="empty">Nothing here yet.</p>`}`;
}

export function project({ ctx, note, html, section, cover, video, model, gallery, skills, back, inGraph, prev, next }) {
  const d = note.data;
  let hero = "";
  if (video?.url) {
    const yt = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
    const vimeo = video.url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (yt) hero = `<div class="embed-frame"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${esc(note.title)} video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    else if (vimeo) hero = `<div class="embed-frame"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="${esc(note.title)} video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    else hero = `<video src="${video.url}" ${cover ? `poster="${cover.url}" ` : ""}autoplay muted loop playsinline controls></video>`;
  } else if (cover) hero = `<img src="${cover.url}" alt="${esc(note.title)}">`;

  const facts = [
    ["Year", d.year], ["Role", d.role], ["Team", d.team], ["Status", d.status], ["Hardware", d.hardware],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");
  const links = [["Code", d.code], ["Paper", d.paper], ["Report", d.report], ["Demo", d.demo]].filter(([, v]) => v);

  return `
<article class="project">
  ${backLink(ctx, section)}
  <header class="page-head">
    <h1>${esc(note.title)}</h1>
    ${d.summary ? `<p class="lede">${esc(d.summary)}</p>` : ""}
  </header>
  ${hero ? `<figure class="hero">${hero}</figure>` : ""}
  <dl class="facts">
    ${facts.map(([k, v]) => `<div${k === "Hardware" ? ' class="facts-wide"' : ""}><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
    ${skills.length ? `<div class="facts-wide"><dt>Skills</dt><dd>${chips(skills, ctx)}</dd></div>` : ""}
    ${links.length ? `<div class="facts-wide"><dt>Links</dt><dd class="fact-links">${links.map(([k, v]) => `<a href="${esc(v)}" rel="noopener">${k} ↗</a>`).join("")}</dd></div>` : ""}
  </dl>
  <div class="prose">${html}</div>
  ${model ? `<section class="model">${label("3D model")}${modelViewer(model.url, note.title + " 3D model")}<p class="hint">Drag to rotate · pinch or scroll to zoom</p></section>` : ""}
  ${gallery.length ? `<section class="gallery">${label("Images")}<div class="gallery-grid">${gallery.map((g, i) => `
    <figure><a href="${g.url}"><img src="${g.url}" alt="${esc(g.caption || note.title)}" loading="lazy"></a><figcaption><span class="count">(${i + 1} of ${gallery.length})</span> ${esc(g.caption)}</figcaption></figure>`).join("")}</div></section>` : ""}
  ${connections({ ctx, note, back, inGraph })}
  ${pager({ ctx, prev, next })}
</article>`;
}

export function skill({ ctx, note, html, section, projects, back, inGraph, prev, next }) {
  const d = note.data;
  const facts = [["Level", d.level], ["Since", d.since]].filter(([, v]) => v);
  return `
<article class="skill">
  ${backLink(ctx, section)}
  <header class="page-head">
    <h1>${esc(note.title)}</h1>
    ${d.summary ? `<p class="lede">${esc(d.summary)}</p>` : ""}
  </header>
  ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
  <div class="prose">${html}</div>
  ${projects.length ? `<section>${label("Used in")}<div class="cards cards--small">${projects.map(cardHtml).join("")}</div></section>` : ""}
  ${connections({ ctx, note, back: back.filter((b) => b.type !== "projects"), inGraph })}
  ${pager({ ctx, prev, next })}
</article>`;
}

export function note({ ctx, note, html, section, date, back, inGraph, prev, next, resume }) {
  return `
<article class="note">
  ${backLink(ctx, section)}
  <header class="page-head">
    <h1>${esc(note.title)}</h1>
    ${date ? `<p class="small-label">${esc(date)}</p>` : ""}
  </header>
  <div class="prose">${html}</div>
  ${resume ? `<p><a class="button" href="${resume.url}">Download résumé (PDF)</a></p>` : ""}
  ${section ? connections({ ctx, note, back, inGraph }) : ""}
  ${pager({ ctx, prev, next })}
</article>`;
}

export function graphPage({ ctx, note, html, sections }) {
  return `
<header class="page-head">
  <h1>${esc(note.title)}</h1>
  <div class="lede prose">${html}</div>
</header>
<ul class="legend">${sections.map((s) => `<li><span class="swatch" style="background: var(--node-${esc(s.folder)}, var(--muted))"></span>${esc(s.title)}</li>`).join("")}</ul>
${graphBox(ctx, { cls: "graph--full", interactive: true })}`;
}
