/* Creates the visual element for a "media" entry ({type, path, content}).
   lazy = true: stores the path in data-src and does not load it until Atlas.loadMedia() is called. */
window.Atlas = window.Atlas || {};

Atlas.isVideo = (p) => /\.(mp4|webm|mov|m4v|ogv)$/i.test((p || "").split(/[?#]/)[0]);

Atlas.pickMedia = function (item) {
  const m = item.media || [];
  return m.find((x) => x.type === "video") || m.find((x) => x.type === "image") || m.find((x) => x.type === "text") || null;
};

Atlas.mediaEl = function (media, item, lazy) {
  const box = document.createElement("div");
  box.className = "m";
  if (!media) {
    box.classList.add("text");
    box.innerHTML = `<b></b>`;
    box.firstChild.textContent = item.name;
    return box;
  }
  if (media.type === "text") {
    box.classList.add("text");
    const b = document.createElement("b");
    b.textContent = item.name;
    const t = document.createElement("span");
    const txt = media.content || "";
    t.textContent = txt.length > 260 ? txt.slice(0, 260) + "…" : txt;
    box.append(b, t);
    return box;
  }
  const el = document.createElement(media.type === "video" || Atlas.isVideo(media.path) ? "video" : "img");
  if (el.tagName === "VIDEO") Object.assign(el, { muted: true, loop: true, playsInline: true });
  else el.alt = item.name;
  if (lazy) el.dataset.src = media.path; else el.src = media.path;
  box.appendChild(el);
  return box;
};

Atlas.loadMedia = function (root) {
  root.querySelectorAll("[data-src]").forEach((el) => {
    el.src = el.dataset.src;
    el.removeAttribute("data-src");
  });
};
