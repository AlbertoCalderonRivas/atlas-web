/* 1 · Home: a slot machine.
   One reel per ELEMENT (character + location + script + action + music); each reel
   cycles through the CATEGORIES of that element. Hover a reel to show its ▲ ▼ buttons
   (or use the mouse wheel over it). Pull the lever (drag it down, click it, or press
   the space bar) to spin every reel to a random combination.
   Click a reel → timeline of that category. "Open this combination" → timeline mixing
   the five selected categories. */
window.Atlas = window.Atlas || {};

Atlas.Home = function (atlas) {
  document.getElementById("site-title").textContent = atlas.site.title;
  document.getElementById("site-subtitle").textContent = atlas.site.subtitle;
  const reelsBox = document.getElementById("reels");
  const comboLink = document.getElementById("combo-link");
  const comboText = document.getElementById("combo-text");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let spinning = false;

  // ---------- one pane = one category
  function paneEl(cat) {
    const pane = document.createElement(cat ? "a" : "div");
    pane.className = "pane" + (cat ? "" : " empty");
    if (!cat) {
      pane.innerHTML = `<div class="pane-text"><h2>—</h2><p>No categories yet.<br>Add some in config/categories.json</p></div>`;
      return pane;
    }
    pane.href = `#/c/${cat.id}`;
    const bg = document.createElement("div");
    bg.className = "pane-media";
    if (cat.cover) {
      const el = Atlas.mediaEl({ type: Atlas.isVideo(cat.cover) ? "video" : "image", path: cat.cover }, { name: cat.label }, false);
      bg.classList.add("single");
      bg.append(...el.childNodes);
    } else {
      // no cover: mosaic of the category's images
      atlas.items
        .filter((it) => it.categories.includes(cat.id))
        .map((it) => (it.media || []).find((m) => m.type === "image"))
        .filter(Boolean).slice(-4)
        .forEach((m) => { const img = document.createElement("img"); img.src = m.path; bg.appendChild(img); });
      if (bg.children.length === 1) bg.classList.add("single");
    }
    const text = document.createElement("div");
    text.className = "pane-text";
    text.innerHTML = `<span class="pane-count"></span><h2></h2><div class="example"></div><p></p>`;
    text.querySelector(".pane-count").textContent = `${cat.count} works`;
    text.querySelector("h2").textContent = cat.label;
    text.querySelector(".example").textContent = cat.example ? `e.g. ${cat.example}` : "";
    text.querySelector("p").textContent = cat.description || "";
    pane.append(bg, text);
    return pane;
  }

  // ---------- one reel = one element
  function Reel(element) {
    const cats = atlas.categories.filter((c) => c.element === element.id);
    const n = cats.length;
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = `
      <div class="slot-head"><span class="slot-label"></span><span class="slot-pos"></span></div>
      <div class="slot-window">
        <div class="slot-strip"></div>
        <button class="slot-btn up" aria-label="previous">▲</button>
        <button class="slot-btn down" aria-label="next">▼</button>
      </div>`;
    slot.querySelector(".slot-label").textContent = element.label;
    const strip = slot.querySelector(".slot-strip");
    const pos = slot.querySelector(".slot-pos");
    // panes + a copy of the first one at the end, so the reel can loop without jumping
    (n ? [...cats, cats[0]] : [null]).forEach((c) => strip.appendChild(paneEl(c)));
    const panes = [...strip.children];

    let idx = 0;
    const history = [0];

    function show(i, ms, easing = "cubic-bezier(.2,.8,.2,1)") {
      idx = i;
      strip.style.transition = ms ? `transform ${ms}ms ${easing}` : "none";
      strip.style.transform = `translateY(${-i * 100}%)`;
      if (!ms) void strip.offsetHeight; // apply immediately
    }
    function update() {
      const real = idx % Math.max(n, 1);
      pos.textContent = n ? `${real + 1}/${n}` : "0/0";
      panes.forEach((p, k) => {
        const v = p.querySelector("video");
        if (v) { if (k === idx && !spinning) v.play().catch(() => {}); else v.pause(); }
      });
      Atlas.Home.onChange && Atlas.Home.onChange();
    }
    async function step(dir, ms = 380, easing) {
      if (n < 2) return;
      if (dir > 0) {
        if (idx === n) show(0, 0);
        show(idx + 1, ms, easing);
      } else {
        if (idx === 0) show(n, 0);
        show(idx - 1, ms, easing);
      }
      await sleep(ms);
      if (idx === n) show(0, 0); // landed on the copy: snap back to the real first pane
    }
    async function manual(dir) {
      if (spinning) return;
      await step(dir);
      history.push(idx);
      update();
    }

    // spin to a random category, avoiding the current one and the one before it
    async function spin(extraLoops) {
      if (n < 2) return;
      // with 4+ options avoid the last two; with 2–3 only the current one (otherwise it becomes a fixed cycle)
      const avoid = new Set(history.slice(n >= 4 ? -2 : -1));
      const options = [...Array(n).keys()].filter((i) => !avoid.has(i));
      const final = options[Math.floor(Math.random() * options.length)];
      const steps = extraLoops * n + ((final - (idx % n) + n) % n || n);
      strip.classList.add("blur");
      for (let s = 0; s < steps; s++) {
        const left = steps - s;
        if (left === 3) strip.classList.remove("blur");
        const ms = left > 4 ? 70 : 70 + (5 - left) * 90; // slows down at the end
        await step(1, ms, left === 1 ? "cubic-bezier(.3,1.6,.5,1)" : "linear");
      }
      history.push(final);
    }

    slot.querySelector(".up").addEventListener("click", () => manual(-1));
    slot.querySelector(".down").addEventListener("click", () => manual(1));
    let wheelLock = 0;
    slot.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (Date.now() < wheelLock) return;
      wheelLock = Date.now() + 400;
      manual(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    show(0, 0);
    return { el: slot, spin, update, get cat() { return n ? cats[idx % n] : null; } };
  }

  const reels = atlas.elements.map(Reel);
  reels.forEach((r, i) => {
    if (i) {
      const plus = document.createElement("div");
      plus.className = "plus";
      plus.textContent = "+";
      reelsBox.appendChild(plus);
    }
    reelsBox.appendChild(r.el);
  });

  // ---------- current combination
  Atlas.Home.onChange = function () {
    const sel = reels.map((r) => r.cat).filter(Boolean);
    comboText.textContent = sel.map((c) => c.label).join(" + ");
    comboLink.href = `#/mix/${sel.map((c) => c.id).join(",")}`;
  };
  reels.forEach((r) => r.update());

  // ---------- lever
  async function pull() {
    if (spinning) return;
    spinning = true;
    document.body.classList.add("is-spinning");
    reels.forEach((r) => r.update());
    await Promise.all(reels.map((r, i) => r.spin(2 + i))); // reels stop one after another
    spinning = false;
    document.body.classList.remove("is-spinning");
    reels.forEach((r) => r.update());
  }
  Atlas.Lever(document.getElementById("lever"), pull);

  window.addEventListener("keydown", (e) => {
    const home = document.getElementById("home");
    if (e.key === " " && !home.classList.contains("hidden")) { e.preventDefault(); Atlas.Lever.pull(); }
  });
};

/* ---------- the lever: drag the knob down (or click it) and let go */
Atlas.Lever = function (box, onPull) {
  box.innerHTML = `<div class="lever-slot"></div><div class="lever-rod"></div><div class="lever-knob"></div><div class="lever-pivot"></div>`;
  const rod = box.querySelector(".lever-rod"), knob = box.querySelector(".lever-knob");
  const TOP = -120, BOTTOM = 120, TRIGGER = 0;  // knob y relative to the pivot (px)
  let y = TOP, dragging = false, startY = 0, startKnob = 0, moved = false, busy = false;

  function draw() {
    knob.style.transform = `translate(-50%, calc(-50% + ${y}px))`;
    rod.style.top = `calc(50% + ${Math.min(0, y)}px)`;
    rod.style.height = Math.abs(y) + "px";
  }
  function tween(to, ms, ease = (t) => 1 - Math.pow(1 - t, 3)) {
    const from = y, t0 = performance.now();
    return new Promise((res) => {
      (function f(now) {
        const t = Math.min(1, (now - t0) / ms);
        y = from + (to - from) * ease(t);
        draw();
        t < 1 ? requestAnimationFrame(f) : res();
      })(t0);
    });
  }
  const springBack = () => tween(TOP, 700, (t) => 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-5 * t));
  async function release() {
    if (y > TRIGGER) {
      busy = true;
      await tween(BOTTOM, 80);
      const done = onPull();
      await springBack();
      await done;
      busy = false;
    } else {
      springBack();
    }
  }
  Atlas.Lever.pull = async function () {
    if (busy) return;
    busy = true;
    await tween(BOTTOM, 260, (t) => t * t);
    busy = false;
    release();
  };

  knob.addEventListener("pointerdown", (e) => {
    if (busy) return;
    dragging = true; moved = false;
    startY = e.clientY; startKnob = y;
    knob.setPointerCapture(e.pointerId);
    box.classList.add("grabbing");
  });
  knob.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientY - startY) > 3) moved = true;
    y = Math.max(TOP, Math.min(BOTTOM, startKnob + e.clientY - startY));
    draw();
  });
  knob.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    box.classList.remove("grabbing");
    moved ? release() : Atlas.Lever.pull(); // a simple click pulls the whole way
  });
  draw();
};
