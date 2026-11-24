/* Mermaid diagrams: ```mermaid blocks become SVG, themed to match the site and re-drawn on light/dark switch. */
(() => {
  const blocks = [...document.querySelectorAll("pre.mermaid")];
  if (!blocks.length || !window.mermaid) return;
  let run = 0;

  const draw = async () => {
    const css = getComputedStyle(document.documentElement);
    const c = (name) => css.getPropertyValue(name).trim();
    const dark = document.documentElement.dataset.theme !== "light";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: c("--mono") || "monospace",
      themeVariables: {
        darkMode: dark,
        background: c("--bg"),
        fontFamily: c("--mono") || "monospace",
        fontSize: "14px",
        primaryColor: c("--surface"),
        primaryTextColor: c("--ink"),
        primaryBorderColor: c("--accent"),
        secondaryColor: c("--chip"),
        tertiaryColor: c("--bg"),
        lineColor: c("--muted"),
        textColor: c("--text"),
        noteBkgColor: c("--surface"),
        noteTextColor: c("--ink"),
        noteBorderColor: c("--rule"),
        actorBkg: c("--surface"),
        actorBorder: c("--accent"),
        actorTextColor: c("--ink"),
        signalColor: c("--text"),
        signalTextColor: c("--text"),
        edgeLabelBackground: c("--bg"),
        clusterBkg: c("--chip"),
        clusterBorder: c("--rule"),
      },
    });
    for (const el of blocks) {
      try {
        const { svg } = await mermaid.render(`mmd-${++run}`, el.dataset.source);
        el.innerHTML = svg;
        el.classList.add("rendered");
      } catch (err) {
        el.classList.add("failed");
        el.textContent = el.dataset.source; // show the source if the diagram has a syntax error
      }
    }
  };

  draw();
  addEventListener("themechange", draw);
})();
