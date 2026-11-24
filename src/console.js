/* The prompt.
 *
 * Homepage ([data-mode="home"]): a full-screen terminal. Output appears above the
 * prompt; the command grid under it changes with what's on screen.
 *   projects / skills / notes   a table (↑/↓ to move, Enter to open, Esc to collapse)
 *   graph, about, contact, whoami, help, clear, light, dark
 *   open <name>, a number, or just a name ("arm", "ros", "lidar") opens that page
 *
 * Inner pages ([data-mode="dock"]): a prompt bar fixed to the bottom. Commands that
 * show something run on the homepage (index.html#projects); Esc goes back.
 *
 * Page data comes from assets/site-index.js, written by build.mjs.
 * To add a command, add an entry to `commands` below.
 */
(() => {
  const S = window.SITE;
  const doc = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  // ---------- theme (works on every page) ----------
  const setTheme = (t) => {
    doc.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch (e) {}
    dispatchEvent(new Event("themechange"));
  };
  const toggleTheme = () => setTheme(doc.dataset.theme === "light" ? "dark" : "light");
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggleTheme));

  const box = document.querySelector("[data-console]");
  if (!S || !box) return;
  const mode = box.dataset.mode;
  const root = box.dataset.root || "";

  const form = box.querySelector(".term-line");
  const input = form.querySelector("input");
  const cursor = form.querySelector(".cursor");
  const mirror = form.querySelector(".mirror");
  const sug = form.querySelector(".sug");
  const out = box.querySelector(".term-out");
  const log = box.querySelector(".term-log");
  const helpTitle = box.querySelector(".term-help-title");
  const grid = box.querySelector(".grid");
  const dockMsg = box.querySelector(".dock-msg");
  form.hidden = false;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const href = (url) => {
    const h = root + url;
    return S.linkIndex && (h === "" || h.endsWith("/")) ? h + "index.html" : h || "./";
  };
  const homeHref = (hash) => href("") + (hash ? "#" + hash : "");
  const pages = S.pages;
  const byUrl = (url) => pages.find((p) => p.url === url);
  const section = (type) => S.sections.find((s) => s.folder === type);
  const singular = (type) => (section(type)?.title || type).toLowerCase().replace(/s$/, "");

  // ---------- text scramble, used when things appear ----------
  const GLYPHS = "◇○·△◊∘°▫◦";
  const scramble = (el, duration = 520) => {
    if (reduceMotion || !el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    const text = nodes.map((n) => n.nodeValue);
    const total = text.reduce((a, t) => a + t.length, 0) || 1;
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      let k = 0;
      nodes.forEach((n, j) => {
        let s = "";
        for (const ch of text[j]) {
          const settled = ch === " " || k / total < p * 1.25 - 0.25 + Math.random() * 0.12;
          s += settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          k++;
        }
        n.nodeValue = s;
      });
      if (p < 1) requestAnimationFrame(frame);
      else nodes.forEach((n, j) => (n.nodeValue = text[j]));
    };
    requestAnimationFrame(frame);
  };

  // ---------- block cursor ----------
  const placeCursor = () => {
    mirror.textContent = input.value;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    form.classList.toggle("native-caret", document.activeElement === input && !atEnd);
    cursor.style.left = Math.min(mirror.offsetWidth + 1, input.clientWidth - 9) + "px";
  };
  ["input", "keyup", "click", "focus", "blur", "select"].forEach((e) => input.addEventListener(e, placeCursor));
  document.addEventListener("selectionchange", () => document.activeElement === input && placeCursor());

  // ---------- output ----------
  const print = (html, cls = "") => {
    if (mode === "dock") { dockMsg.innerHTML = html; return dockMsg; }
    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = html;
    log.appendChild(div);
    return div;
  };
  const echo = (line) => print(`<span class="ps">›</span>${esc(line)}`, "echo");
  const msg = (html) => print(html, "msg");
  const reveal = (el) => {
    // bring the latest command to the top of the screen, like a terminal
    const echoEl = el.previousElementSibling?.classList.contains("echo") ? el.previousElementSibling : el;
    requestAnimationFrame(() => out.scrollTo({ top: Math.max(0, echoEl.offsetTop - 24) }));
  };
  const block = (title, sub, inner) => {
    const el = print(`<section class="block"><h2 class="block-title">${esc(title)}</h2>${sub ? `<p class="block-sub">${esc(sub)}</p>` : ""}${inner}</section>`);
    scramble(el.querySelector(".block-title"));
    reveal(el);
    return el;
  };

  // ---------- command grid under the prompt ----------
  const cmdHtml = ([cmd, desc, run = cmd]) => `<button type="button" class="cmd" data-run="${esc(run)}"><b>${esc(cmd)}</b><span>- ${esc(desc)}</span></button>`;
  const ghost = `<span class="ghost" aria-hidden="true"></span>`;
  const sectionCmds = (except) => S.sections.filter((s) => s.folder !== except).map((s) => [s.folder, s.command || s.title.toLowerCase()]);
  const has = (url) => !!byUrl(url);
  const homeCmds = () => [
    ...sectionCmds(),
    ...(has("graph/") ? [["graph", "how it connects"]] : []),
    ...(has("about/") ? [["about", "about me"]] : []),
    ["contact", "get in touch"],
    ["light / dark", "switch themes", "theme"],
    ["clear", "reset terminal"],
  ];
  const setContext = (ctx) => {
    if (!grid) return;
    let title, items;
    if (ctx === "table") {
      title = "Available commands:";
      items = [["↑ / ↓", "navigate", "down"], ["Enter", `open ${singular(active.type)}`, "enter"], ["Esc", "collapse", "esc"],
        ...sectionCmds(active.type), ...(has("about/") ? [["about", "about me"]] : []), ["contact", "get in touch"], ["clear", "return home"], ["help", "all commands"]];
    } else if (ctx === "view") {
      title = "Available commands:";
      items = [["Esc", "back", "esc"], ...sectionCmds(), ...(has("about/") ? [["about", "about me"]] : []), ["clear", "return home"], ["help", "all commands"]];
    } else {
      title = "Type <code>help</code> for commands, or try:";
      items = homeCmds();
    }
    const html = items.map(cmdHtml);
    if (html.length > 4) html.splice(1, 0, ghost), html.splice(5, 0, ghost); // the little empty chips, as on emrah.ca
    helpTitle.innerHTML = title;
    grid.innerHTML = html.join("");
    scramble(grid, 380);
  };

  // ---------- tables ----------
  let active = null; // { type, items, rows, tiles, sel }
  const columns = {
    projects: [["Project", (p) => esc(p.title)], ["Year", (p) => esc(p.year), "nowrap"], ["Stack", (p) => esc(p.stack.slice(0, 3).join(", ")), "dim hide-sm"]],
    skills: [["Skill", (p) => esc(p.title)], ["Level", (p) => esc(p.level), "dim hide-sm"], ["Projects", (p) => (p.projects || "–"), "nowrap"]],
    notes: [["Note", (p) => esc(p.title)], ["Date", (p) => esc(p.date), "nowrap"]],
  };
  const fallbackCols = [["Title", (p) => esc(p.title)], ["Summary", (p) => esc(p.summary), "dim hide-sm"]];

  const mosaic = (items) => {
    const withCover = items.filter((p) => p.cover);
    if (!withCover.length) return "";
    return `<div class="mosaic">${withCover.map((p) => `
      <a class="tile" href="${href(p.url)}" data-url="${esc(p.url)}">
        <img src="${root + p.cover}" alt="" loading="lazy">
        <span class="tile-cap"><b>${esc(p.title)}</b><span>${esc([p.year, p.stack.slice(0, 2).join(", ")].filter(Boolean).join(" · "))}</span></span>
        ${p.featured ? `<span class="tag">featured</span>` : ""}
      </a>`).join("")}</div>`;
  };

  const table = (type) => {
    const items = pages.filter((p) => p.type === type);
    const sec = section(type);
    if (!items.length) return msg(`No ${esc(sec?.title.toLowerCase() || type)} yet.`);
    const cols = columns[type] || fallbackCols;
    const el = block(sec?.title || type, sec?.intro, `
      ${type === "projects" ? mosaic(items) : ""}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th class="n">#</th>${cols.map(([h, , cls = ""]) => `<th class="${cls}">${h}</th>`).join("")}</tr></thead>
        <tbody>${items.map((p, i) => `<tr data-i="${i}"><td class="n">${i + 1}</td>${cols.map(([, f, cls = ""], c) => `<td class="${cls}">${c === 0 ? `<a href="${href(p.url)}">${f(p)}</a>` : f(p)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
      <p class="block-more"><a href="${href(type + "/")}">see all ${esc((sec?.title || type).toLowerCase())} →</a></p>`);
    active = { type, items, sel: -1, rows: [...el.querySelectorAll("tbody tr")], tiles: [...el.querySelectorAll(".tile")] };
    active.rows.forEach((tr) => {
      tr.addEventListener("mouseenter", () => select(+tr.dataset.i, false));
      tr.addEventListener("click", (e) => { if (!e.target.closest("a")) navigate(active.items[+tr.dataset.i]); });
    });
    setContext("table");
  };
  const select = (i, scroll = true) => {
    if (!active) return;
    active.sel = (i + active.items.length) % active.items.length;
    active.rows.forEach((r, j) => r.classList.toggle("sel", j === active.sel));
    const url = active.items[active.sel].url;
    active.tiles.forEach((t) => {
      const on = t.dataset.url === url;
      t.classList.toggle("sel", on);
      if (on && scroll) t.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
    if (scroll) active.rows[active.sel].scrollIntoView({ block: "nearest" });
  };
  const collapse = () => {
    if (active) active.rows.forEach((r) => r.classList.remove("sel"));
    active = null;
    setContext("home");
  };

  // ---------- views ----------
  const navigate = (p, url) => {
    const target = url || href(p.url);
    if (mode === "dock") msg(`opening ${esc(p?.title || "")}…`);
    else msg(`opening <span class="ink">${esc(p?.title || "")}</span>…`);
    setTimeout(() => (location.href = target), reduceMotion ? 0 : 200);
  };
  const graphView = () => {
    const el = block("Graph", "Every project, skill and note, and how they link. Drag the dots; click one to open it.",
      `<div class="graph graph--term" data-root="${esc(root)}"></div><p class="block-more"><a href="${href("graph/")}">open the full graph →</a></p>`);
    active = null;
    setContext("view");
    if (window.mountGraph) requestAnimationFrame(() => window.mountGraph(el.querySelector(".graph")));
  };
  const aboutView = () => {
    if (!S.about) return navigate(byUrl("about/"));
    block("About", "", `<div class="prose about-body">${S.about.html}</div>${S.about.resume ? `<p><a class="button" href="${root + S.about.resume}">download résumé (PDF)</a></p>` : ""}`);
    active = null;
    setContext("view");
  };
  const contactView = () => {
    const links = Object.entries(S.links || {});
    block("Contact", "The quickest way to reach me.", `<div class="tbl-wrap"><table class="tbl"><tbody>${links.map(([k, v]) => `<tr><td class="nowrap">${esc(k)}</td><td><a href="${esc(v)}" rel="noopener">${esc(v.replace(/^(mailto:|https?:\/\/(www\.)?)/, ""))}</a></td></tr>`).join("")}</tbody></table></div>`);
    active = null;
    setContext("view");
  };
  const introHtml = document.querySelector(".intro-body")?.innerHTML || "";
  const whoami = () => {
    block(S.name, "", `<div class="intro-body">${introHtml}</div>`);
    active = null;
    setContext("home");
  };
  const helpView = () => {
    block("Commands", "Type any of these, or a project, skill or note name.", `<div class="tbl-wrap"><table class="tbl"><tbody>${commands.filter((c) => !c.hidden).map((c) => `<tr data-run="${esc(c.name)}"><td class="nowrap"><b>${esc(c.label || c.name)}</b></td><td class="dim">${esc(c.desc)}</td></tr>`).join("")}</tbody></table></div>`);
    active = null;
    setContext("view");
  };
  const clear = () => {
    if (log) log.replaceChildren();
    active = null;
    setContext("home");
    if (out) out.scrollTo({ top: 0 });
  };

  // ---------- commands ----------
  const inDock = (name) => () => navigate({ title: name }, homeHref(name)); // run it on the homepage
  const commands = [
    ...S.sections.map((s) => ({ name: s.folder, desc: s.command || `list ${s.title.toLowerCase()}`, run: mode === "dock" ? inDock(s.folder) : () => table(s.folder) })),
    ...(has("graph/") ? [{ name: "graph", desc: "how it all connects", run: mode === "dock" ? () => navigate(byUrl("graph/")) : graphView }] : []),
    ...(has("about/") ? [{ name: "about", desc: "about me and my résumé", run: mode === "dock" ? () => navigate(byUrl("about/")) : aboutView }] : []),
    { name: "contact", desc: "get in touch", run: mode === "dock" ? inDock("contact") : contactView },
    { name: "open", label: "open <name>", desc: "open a page, e.g. open arm", run: (arg) => openPage(arg) },
    { name: "whoami", desc: "who I am", run: mode === "dock" ? inDock("whoami") : whoami },
    { name: "light", desc: "light theme", run: () => setTheme("light") },
    { name: "dark", desc: "dark theme", run: () => setTheme("dark") },
    { name: "theme", desc: "switch themes", run: toggleTheme, hidden: true },
    { name: "help", desc: "show all commands", run: mode === "dock" ? inDock("help") : helpView },
    { name: "clear", desc: mode === "dock" ? "go home" : "reset terminal", run: mode === "dock" ? () => (location.href = homeHref()) : clear },
    { name: "home", desc: "go home", run: () => (mode === "dock" ? (location.href = homeHref()) : clear()), hidden: true },
    // keys, also clickable in the command grid
    { name: "down", run: () => select((active?.sel ?? -1) + 1), hidden: true, silent: true },
    { name: "enter", run: () => active && active.sel >= 0 && navigate(active.items[active.sel]), hidden: true, silent: true },
    { name: "esc", run: () => goBack(), hidden: true, silent: true },
  ];
  const findCommand = (word) => commands.find((c) => c.name === norm(word));

  const goBack = () => {
    if (mode === "home") return collapse();
    const back = document.querySelector(".back");
    location.href = back ? back.href : homeHref();
  };

  // ---------- matching ----------
  const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const score = (q, p) => {
    q = norm(q).trim();
    if (!q) return 0;
    let best = 0;
    for (const raw of [p.title, p.name, ...p.aliases]) {
      const t = norm(raw);
      if (t === q) return 100;
      if (t.startsWith(q)) best = Math.max(best, 80);
      else if (t.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) best = Math.max(best, 70);
      else if (t.includes(q)) best = Math.max(best, 55);
      else if (q.length > 2) {
        let i = 0;
        for (const ch of t) if (ch === q[i]) i++;
        if (i === q.length) best = Math.max(best, 20);
      }
    }
    if (!best && q.length > 2 && norm(p.summary).includes(q)) best = 10;
    return best && best + (p.type === "projects" ? 2 : 0); // projects win ties
  };
  const findPages = (q, n = 6) =>
    pages.map((p) => [score(q, p), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, n).map(([, p]) => p);
  const distance = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };

  const openPage = (q) => {
    if (!q.trim()) return msg(`open what? try <code>open arm</code>`);
    const [p] = findPages(q, 1);
    if (p) return navigate(p);
    msg(`nothing called “${esc(q)}”. type <code>help</code> for commands.`);
  };

  // ---------- running ----------
  const past = []; // command history for ↑/↓
  let hIdx = -1;
  const run = (raw, { quiet = false } = {}) => {
    const line = raw.trim();
    if (!line) return;
    hideSuggest();
    const [word, ...rest] = line.split(/\s+/);
    const cmd = findCommand(word);
    if (cmd?.silent) return cmd.run(rest.join(" "));
    if (!quiet && mode === "home") echo(line);
    past.unshift(line);
    hIdx = -1;
    if (cmd) return cmd.run(rest.join(" "));
    if (/^\d+$/.test(line)) {
      const list = active?.items;
      if (list && list[+line - 1]) return navigate(list[+line - 1]);
      return msg(list ? `there's no ${esc(line)} in this list.` : `list something first, e.g. <code>projects</code>, then type its number.`);
    }
    const [p] = findPages(line, 1);
    if (p && score(line, p) >= 55) return navigate(p);
    const close = commands.find((c) => !c.hidden && distance(norm(word), c.name) <= 2);
    const maybe = findPages(line, 2);
    const options = [
      ...(close ? [`<button type="button" class="inline cmd-inline" data-run="${close.name}">${close.name}</button>`] : []),
      ...maybe.map((m) => `<a href="${href(m.url)}">${esc(m.title)}</a>`),
    ];
    msg(`command not found: ${esc(word)}.${options.length ? ` did you mean ${options.join(" or ")}?` : ""}${mode === "home" ? " type <code>help</code> for commands." : ""}`);
  };

  // ---------- suggestions ----------
  let items = [], sel = -1;
  const hideSuggest = () => {
    sug.hidden = true;
    sug.replaceChildren();
    items = [];
    sel = -1;
    input.setAttribute("aria-expanded", "false");
  };
  const renderSuggest = () => {
    const q = input.value.trim();
    if (!q) return hideSuggest();
    const [word, ...rest] = q.split(/\s+/);
    const arg = rest.join(" ");
    const cmdItems = arg ? [] : commands.filter((c) => !c.hidden && c.name.startsWith(norm(word)) && c.name !== norm(word)).slice(0, 3)
      .map((c) => ({ kind: "cmd", value: c.name, label: c.name, meta: c.desc }));
    const query = norm(word) === "open" ? arg : q;
    const pageItems = query ? findPages(query, 6 - cmdItems.length).map((p) => ({ kind: "page", page: p, value: p.title, label: p.title, meta: p.type === "page" ? "page" : singular(p.type) })) : [];
    items = [...cmdItems, ...pageItems];
    if (!items.length) return hideSuggest();
    sel = Math.min(sel, items.length - 1);
    sug.innerHTML = items.map((it, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}"><span class="k">${it.kind === "cmd" ? "›" : "↗"}</span><span>${esc(it.label)}</span><span class="m">${esc(it.meta)}</span></li>`).join("");
    sug.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };
  const choose = (it) => {
    input.value = "";
    hideSuggest();
    placeCursor();
    if (it.kind === "cmd") run(it.value);
    else { if (mode === "home") echo(it.page.title); navigate(it.page); }
  };

  input.addEventListener("input", () => { sel = -1; renderSuggest(); });
  input.addEventListener("keydown", (e) => {
    const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
    const d = e.key === "ArrowDown" ? 1 : -1;
    if (vertical && items.length) {
      e.preventDefault();
      sel = (sel + d + items.length) % items.length;
      renderSuggest();
    } else if (vertical && active && !input.value) {
      e.preventDefault();
      select(active.sel < 0 && d < 0 ? active.items.length - 1 : active.sel + d);
    } else if (vertical && past.length) {
      e.preventDefault();
      hIdx = Math.max(-1, Math.min(past.length - 1, hIdx - d));
      input.value = hIdx >= 0 ? past[hIdx] : "";
      placeCursor();
    } else if (e.key === "Tab" && items.length) {
      e.preventDefault();
      const it = items[Math.max(sel, 0)];
      input.value = it.kind === "cmd" ? it.value + " " : it.value;
      sel = -1;
      renderSuggest();
      placeCursor();
    } else if (e.key === "Escape") {
      if (items.length) hideSuggest();
      else if (input.value) input.value = "";
      else goBack();
      placeCursor();
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (sel >= 0 && items[sel]) return choose(items[sel]);
    if (!input.value.trim() && active && active.sel >= 0) return navigate(active.items[active.sel]);
    const v = input.value;
    input.value = "";
    placeCursor();
    run(v);
  });
  sug.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li");
    if (li) { e.preventDefault(); choose(items[+li.dataset.i]); }
  });
  input.addEventListener("blur", () => setTimeout(hideSuggest, 120));

  // Anything with data-run (the command grid, help rows, "did you mean") runs as a command
  box.addEventListener("click", (e) => {
    const t = e.target.closest("[data-run]");
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    run(t.dataset.run);
    if (finePointer) input.focus({ preventScroll: true });
  });

  // Typing anywhere goes to the prompt; "/" focuses it; Esc goes back
  document.addEventListener("keydown", (e) => {
    const el = document.activeElement;
    const typing = el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); input.focus(); }
    else if (e.key === "Escape") goBack();
    else if (mode === "home" && (e.key === "ArrowDown" || e.key === "ArrowUp") && active) { e.preventDefault(); input.focus(); select(active.sel + (e.key === "ArrowDown" ? 1 : -1)); }
    else if (mode === "home" && e.key === "Enter" && active && active.sel >= 0) navigate(active.items[active.sel]);
    else if (mode === "home" && e.key.length === 1) input.focus(); // the keystroke lands in the prompt
  });

  // ---------- start ----------
  placeCursor();
  if (mode === "home") {
    setContext("home");
    scramble(log.querySelector(".block-title"), 700);
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && findCommand(hash)) {
      history.replaceState(null, "", location.pathname + location.search);
      run(hash);
    }
    if (finePointer) input.focus({ preventScroll: true });
  }
})();
