/* Draws an Obsidian-style graph of the site with force-graph.
 * Every element with [data-graph] becomes a graph:
 *   data-focus="projects/x/"  show only that page and its direct links
 *   data-interactive          allow zoom and pan (the full graph page)
 * Node colours come from the CSS variables --node-<section folder> in style.css.
 */
(() => {
  const data = window.GRAPH;
  if (!data || !window.ForceGraph) return;

  let C = {}, nodeColours = {};
  const readColours = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (name) => s.getPropertyValue(name).trim();
    C = { other: v("--muted"), line: v("--graph-line"), ink: v("--ink"), accent: v("--accent"), bg: v("--bg"), font: v("--mono") || "monospace" };
    // one colour per section folder: --node-projects, --node-skills, ...
    nodeColours = {};
    for (const n of data.nodes) nodeColours[n.type] ??= v(`--node-${n.type}`) || C.other;
  };
  readColours();

  const degree = new Map();
  for (const l of data.links) {
    degree.set(l.source, (degree.get(l.source) || 0) + 1);
    degree.set(l.target, (degree.get(l.target) || 0) + 1);
  }
  const radius = (n) => 3 + Math.sqrt(degree.get(n.id) || 0) * 2.2;
  const idOf = (end) => (typeof end === "object" ? end.id : end);
  const graphs = [];

  const mount = (el) => {
    const root = el.dataset.root || "";
    const focus = el.dataset.focus;
    const interactive = "interactive" in el.dataset;

    let nodes = data.nodes, links = data.links;
    if (focus) {
      const keep = new Set([focus]);
      for (const l of links) {
        if (l.source === focus) keep.add(l.target);
        if (l.target === focus) keep.add(l.source);
      }
      nodes = nodes.filter((n) => keep.has(n.id));
      links = links.filter((l) => keep.has(l.source) && keep.has(l.target));
    }
    if (nodes.length < 2) { el.remove(); return; }
    el.innerHTML = "";

    const near = new Map(nodes.map((n) => [n.id, new Set()]));
    for (const l of links) { near.get(l.source).add(l.target); near.get(l.target).add(l.source); }

    let hover = null, fitted = false;
    const narrow = el.clientWidth < 560;
    const pad = narrow ? 70 : 40; // room for labels
    const lit = (id) => !hover || id === hover || near.get(hover).has(id);

    const g = ForceGraph()(el)
      .graphData({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) })
      .width(el.clientWidth)
      .height(el.clientHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .nodeLabel(() => "")
      .linkColor((l) => (hover && (idOf(l.source) === hover || idOf(l.target) === hover) ? C.accent : C.line))
      .linkWidth((l) => (hover && (idOf(l.source) === hover || idOf(l.target) === hover) ? 1.6 : 1))
      .nodeCanvasObject((n, ctx, scale) => {
        const r = radius(n);
        ctx.globalAlpha = lit(n.id) ? 1 : 0.18;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = nodeColours[n.type];
        ctx.fill();
        if (n.id === focus) {
          ctx.lineWidth = 1.5 / scale;
          ctx.strokeStyle = C.ink;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 3 / scale, 0, 2 * Math.PI);
          ctx.stroke();
        }
        const show = focus || scale > 1.6 || (hover && lit(n.id)) ||
          (narrow ? n.type === "projects" : (degree.get(n.id) || 0) >= 3);
        if (show) {
          const size = 11 / scale;
          ctx.font = `${size}px ${C.font}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.lineWidth = 3 / scale;
          ctx.strokeStyle = C.bg;
          ctx.strokeText(n.title, n.x, n.y + r + 3 / scale);
          ctx.fillStyle = C.ink;
          ctx.fillText(n.title, n.x, n.y + r + 3 / scale);
        }
        ctx.globalAlpha = 1;
      })
      .nodePointerAreaPaint((n, colour, ctx) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius(n) + 4, 0, 2 * Math.PI);
        ctx.fill();
      })
      .onNodeHover((n) => {
        hover = n ? n.id : null;
        el.style.cursor = n ? "pointer" : "";
        g.linkWidth(g.linkWidth()); // trigger a redraw
      })
      .onNodeClick((n) => {
        location.href = root + n.url + (window.LINK_INDEX ? "index.html" : "");
      })
      .enableZoomInteraction(interactive)
      .enablePanInteraction(interactive)
      .warmupTicks(80)
      .cooldownTicks(100)
      .onEngineStop(() => {
        if (!fitted) { g.zoomToFit(400, pad); fitted = true; }
      });
    setTimeout(() => g.zoomToFit(0, pad), 30);

    g.d3Force("charge").strength(focus ? -220 : -110);
    g.d3Force("link").distance(focus ? 70 : 45);

    new ResizeObserver(() => g.width(el.clientWidth).height(el.clientHeight)).observe(el);
    graphs.push(g);
  };

  window.mountGraph = mount; // used by the homepage prompt's `graph` command
  document.querySelectorAll("[data-graph]").forEach(mount);

  addEventListener("themechange", () => {
    readColours();
    graphs.forEach((g) => g.linkWidth(g.linkWidth()));
  });
})();
