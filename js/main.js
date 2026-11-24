/* Navigation between the three parts:
     #/                    home (slot machine)
     #/c/<category>        timeline of one category
     #/mix/<id>,<id>,…     timeline of a combination (one category per element)
     #/info                information mode */
(function () {
  const atlas = window.ATLAS;
  if (!atlas) {
    document.body.innerHTML = "<p style='padding:40px;font-family:monospace'>Missing web/data/atlas.js — run: python scraper/build.py</p>";
    return;
  }
  Atlas.Home(atlas);
  Atlas.Info(atlas);
  const timeline = Atlas.Timeline(atlas);
  const views = { home: document.getElementById("home"), timeline: document.getElementById("timeline"), info: document.getElementById("info") };
  const cats = Object.fromEntries(atlas.categories.map((c) => [c.id, c]));
  const elements = Object.fromEntries((atlas.elements || []).map((e) => [e.id, e]));
  let lastBase = "#/", current = null;

  // hash → selection for the timeline (or null)
  function selection(h) {
    let m = h.match(/^#\/c\/(.+)$/);
    if (m && cats[m[1]]) {
      const c = cats[m[1]];
      const el = elements[c.element];
      return { ids: [c.id], label: c.label, hud: el ? `${el.label} · ${c.label}` : c.label,
               cover: c.cover, example: c.example, description: c.description };
    }
    m = h.match(/^#\/mix\/(.+)$/);
    if (m) {
      const list = m[1].split(",").map((id) => cats[id]).filter(Boolean);
      if (list.length) return { ids: list.map((c) => c.id), label: list.map((c) => c.label).join(" + "),
                                cover: "", description: `${list.length} genealogies superimposed` };
    }
    return null;
  }

  function route() {
    const h = location.hash || "#/";
    if (h === "#/info") {
      views.info.classList.remove("hidden");
      document.getElementById("info-close").href = lastBase;
      return;
    }
    views.info.classList.add("hidden");
    lastBase = h;
    const sel = selection(h);
    if (sel) {
      views.home.classList.add("hidden");
      views.timeline.classList.remove("hidden");
      if (current !== h) timeline.open(sel); // coming back from "info" does not restart the journey
      current = h;
    } else {
      current = null;
      timeline.close();
      views.timeline.classList.add("hidden");
      views.home.classList.remove("hidden");
    }
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && location.hash === "#/info") location.hash = lastBase; });
  route();
})();
