/* 2 · Expanded timeline: a 3D space receding into the distance.
   The mouse wheel moves the camera into the past. Each work floats at its temporal
   depth; works with a range (date_start–date_end) stay visible throughout their whole
   period ("temporal volume"). The x/y position is pseudo-random per id: proximity on
   screen does not imply a relationship (Mnemosyne Atlas), only contemporaneity.
   open(sel) receives a selection: { ids: [category ids], label, cover, example, description }
   — one category, or the five categories of a slot-machine combination. */
window.Atlas = window.Atlas || {};

Atlas.Timeline = function (atlas) {
  const cfg = atlas.site.timeline;
  const ts = Atlas.TimeScale(cfg);
  const $ = (id) => document.getElementById(id);
  const world = $("world"), yearEl = $("tl-year"), countEl = $("tl-count");
  const minimap = $("minimap"), cursor = $("minimap-cursor"), tooltip = $("tooltip"), hint = $("tl-hint");

  let cards = [], cam = 0, target = 0, maxDepth = 1, raf = null, active = false;

  // ---------- utilities
  function hash(str, seed = 0) {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000; // 0..1
  }
  const place = (x, y, z) => `translate3d(${x}px, ${y}px, ${-z}px) translate(-50%, -50%)`;

  // ---------- scene construction
  function build(sel) {
    world.innerHTML = "";
    minimap.querySelectorAll(".dot,.bar,.tick").forEach((n) => n.remove());
    cards = [];

    const catLabel = Object.fromEntries(atlas.categories.map((c) => [c.id, c.label]));
    const mix = sel.ids.length > 1;
    const items = atlas.items.filter((it) => sel.ids.some((id) => it.categories.includes(id)) && it.date_start != null);
    const oldest = items.length ? Math.min(...items.map((it) => it.date_start)) : 1900;
    maxDepth = ts.depth(oldest) + 400;

    // cover: the AI video (starting point of the reverse genealogy)
    const cover = document.createElement("div");
    cover.className = "cover";
    if (sel.cover) cover.appendChild(Atlas.mediaEl({ type: Atlas.isVideo(sel.cover) ? "video" : "image", path: sel.cover }, { name: sel.label }, false));
    const h = document.createElement("h2"); h.textContent = sel.label;
    const p = document.createElement("p"); p.textContent = sel.example ? `e.g. ${sel.example}` : sel.description || "";
    cover.append(h, p);
    cover.style.transform = place(0, 0, -150);
    world.appendChild(cover);
    const v = cover.querySelector("video"); if (v) { v.autoplay = true; v.play().catch(() => {}); }
    cards.push({ el: cover, z: -150, fixed: true });

    // temporal reference frames (receding into the distance)
    const fw = cfg.spread_x * 2 + 500, fh = cfg.spread_y * 2 + 360;
    cfg.milestones.filter((y) => y >= oldest - 1 && y <= cfg.present_year).forEach((y) => {
      const f = document.createElement("div");
      f.className = "frame";
      f.style.width = fw + "px"; f.style.height = fh + "px";
      f.innerHTML = `<span>${ts.format(y)}</span>`;
      const z = ts.depth(y);
      f.style.transform = place(0, 0, z);
      world.appendChild(f);
      cards.push({ el: f, z, fixed: true });

      const t = document.createElement("div");
      t.className = "tick"; t.textContent = ts.format(y);
      t.style.top = (z / maxDepth) * 100 + "%";
      minimap.appendChild(t);
    });

    // works
    items.forEach((it) => {
      const zStart = ts.depth(it.date_start);
      const zEnd = it.date_end != null ? ts.depth(it.date_end) : zStart; // zEnd < zStart (closer)
      const ranged = zStart - zEnd > 20;

      let x = (hash(it.id, 1) * 2 - 1) * cfg.spread_x;
      let y = (hash(it.id, 2) * 2 - 1) * cfg.spread_y;
      // keep the central corridor clear so the depth is visible
      if (Math.abs(x) < cfg.spread_x * 0.22 && Math.abs(y) < cfg.spread_y * 0.35) x += Math.sign(x || 1) * cfg.spread_x * 0.3;
      const w = 240 + Math.round(hash(it.id, 3) * 160);

      const el = document.createElement("div");
      el.className = "card" + (ranged ? " ranged" : "");
      el.style.width = w + "px";
      el.appendChild(Atlas.mediaEl(Atlas.pickMedia(it), it, true));
      const cap = document.createElement("div");
      cap.className = "cap";
      cap.innerHTML = `<strong></strong><span></span>`;
      cap.firstChild.textContent = it.name;
      cap.lastChild.textContent = it.date_display || ts.format(it.date_start);
      if (mix) { // which part of the combination this work comes from
        const em = document.createElement("em");
        em.textContent = sel.ids.filter((id) => it.categories.includes(id)).map((id) => catLabel[id]).join(" · ");
        cap.appendChild(em);
      }
      el.appendChild(cap);
      if (it.url) el.addEventListener("click", () => window.open(it.url, "_blank", "noopener"));
      el.addEventListener("mouseenter", () => showTip(it));
      el.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
      world.appendChild(el);

      let span = null;
      if (ranged) {
        span = document.createElement("div");
        span.className = "span";
        span.style.width = zStart - zEnd + "px";
        span.style.transform = `translate3d(${x}px, ${y}px, ${-zEnd}px) rotateY(90deg)`;
        world.appendChild(span);
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.top = (zEnd / maxDepth) * 100 + "%";
        bar.style.height = ((zStart - zEnd) / maxDepth) * 100 + "%";
        minimap.appendChild(bar);
      }
      const dot = document.createElement("div");
      dot.className = "dot";
      dot.style.top = (zEnd / maxDepth) * 100 + "%";
      minimap.appendChild(dot);

      cards.push({ el, span, x, y, zStart, zEnd, ranged, z: zEnd, loaded: false });
    });
    countEl.textContent = `${items.length} works`;
  }

  function showTip(it) {
    tooltip.innerHTML = "";
    const s = document.createElement("strong"); s.textContent = it.name;
    const d = document.createElement("div");
    d.textContent = [it.date_display, `tag: ${it.tags.join(", ")}`, `source: ${it.source}`, it.url ? "click → open reference" : ""].filter(Boolean).join("\n");
    d.style.whiteSpace = "pre-line";
    tooltip.append(s, d);
    tooltip.classList.remove("hidden");
  }
  document.addEventListener("mousemove", (e) => {
    tooltip.style.left = Math.min(e.clientX + 16, innerWidth - 320) + "px";
    tooltip.style.top = e.clientY + 16 + "px";
  });

  // ---------- animation loop
  function frame() {
    if (!active) return;
    cam += (target - cam) * 0.1;
    world.style.transform = `translateZ(${cam}px)`;
    const far = cfg.visible_distance;

    for (const c of cards) {
      if (c.ranged) {
        // temporal volume: while the camera is inside the range, the work travels with it
        c.z = Math.min(c.zStart, Math.max(c.zEnd, cam + cfg.range_ahead));
        c.el.style.transform = place(c.x, c.y, c.z);
      } else if (c.x !== undefined && !c.placed) {
        c.el.style.transform = place(c.x, c.y, c.z);
        c.placed = true;
      }
      const rel = cam - c.z; // < 0: in front of the camera; > 0: already passed through
      let o = 1;
      if (rel < -far) o = 0;
      else if (rel < -far * 0.65) o = (rel + far) / (far * 0.35);
      if (rel > 150) o = Math.max(0, 1 - (rel - 150) / 450);
      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o <= 0.001 ? "hidden" : "visible";
      if (c.span) c.span.style.opacity = Math.min(1, o + 0.3).toFixed(3);
      if (!c.loaded && o > 0 && !c.fixed) { Atlas.loadMedia(c.el); c.loaded = true; }
      const vid = c.el.querySelector("video");
      if (vid) { if (o > 0.2 && vid.paused) vid.play().catch(() => {}); else if (o <= 0.2 && !vid.paused) vid.pause(); }
    }

    yearEl.textContent = ts.format(ts.year(cam + 300));
    cursor.style.top = (Math.max(0, cam + 300) / maxDepth) * 100 + "%";
    raf = requestAnimationFrame(frame);
  }

  // ---------- controls
  const move = (d) => {
    target = Math.max(-200, Math.min(maxDepth, target + d));
    hint.style.opacity = 0;
  };
  window.addEventListener("wheel", (e) => { if (active) { e.preventDefault(); move(e.deltaY * cfg.scroll_speed); } }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (!active) return;
    const step = { ArrowDown: 250, PageDown: 900, ArrowUp: -250, PageUp: -900, " ": 900 }[e.key];
    if (step) { e.preventDefault(); move(step); }
    if (e.key === "Escape") location.hash = "#/";
  });
  let touchY = null;
  window.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; });
  window.addEventListener("touchmove", (e) => {
    if (!active || touchY == null) return;
    move((touchY - e.touches[0].clientY) * cfg.scroll_speed * 2);
    touchY = e.touches[0].clientY;
  });
  minimap.addEventListener("click", (e) => {
    const r = minimap.getBoundingClientRect();
    target = ((e.clientY - r.top) / r.height) * maxDepth - 300;
  });

  return {
    open(sel) {
      document.getElementById("tl-category").textContent = sel.hud || sel.label;
      build(sel);
      cam = target = -200;
      hint.style.opacity = 1;
      active = true;
      cancelAnimationFrame(raf);
      frame();
    },
    close() {
      active = false;
      cancelAnimationFrame(raf);
      world.querySelectorAll("video").forEach((v) => v.pause());
      tooltip.classList.add("hidden");
    },
  };
};
