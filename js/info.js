/* 3 · Information mode: texts from config/site.json → "info", plus the archive by element */
window.Atlas = window.Atlas || {};

Atlas.Info = function (atlas) {
  const box = document.getElementById("info-content");
  const h = document.createElement("h2");
  h.textContent = atlas.site.title;
  box.appendChild(h);
  (atlas.site.info || []).forEach((txt) => {
    const p = document.createElement("p");
    p.textContent = txt;
    box.appendChild(p);
  });

  const h3 = document.createElement("h3");
  h3.textContent = "Archive";
  const table = document.createElement("table");
  (atlas.elements || []).forEach((el) => {
    atlas.categories.filter((c) => c.element === el.id).forEach((c, i) => {
      const tr = table.insertRow();
      tr.insertCell().textContent = i === 0 ? el.label : "";
      const a = document.createElement("a");
      a.href = `#/c/${c.id}`;
      a.textContent = c.label;
      tr.insertCell().appendChild(a);
      tr.insertCell().textContent = `${c.count} works`;
    });
  });
  const tr = table.insertRow();
  tr.insertCell().textContent = "Sources";
  tr.insertCell();
  tr.insertCell().textContent = [...new Set(atlas.items.map((it) => it.source))].join(", ");
  box.append(h3, table);
};
