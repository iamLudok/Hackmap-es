/* Hackathones España: listado, mapa y rankings. Sin build, solo D3 desde CDN. */

const CCAA_ATLAS = {
  "Andalucía": "Andalucía",
  "Aragón": "Aragón",
  "Principado de Asturias": "Asturias",
  "Cantabria": "Cantabria",
  "Castilla y León": "Castilla y León",
  "Castilla-La Mancha": "Castilla-La Mancha",
  "Cataluña/Catalunya": "Cataluña",
  "Comunitat Valenciana": "Comunidad Valenciana",
  "Extremadura": "Extremadura",
  "Galicia": "Galicia",
  "Comunidad de Madrid": "Madrid",
  "Región de Murcia": "Murcia",
  "Comunidad Foral de Navarra": "Navarra",
  "País Vasco/Euskadi": "País Vasco",
  "La Rioja": "La Rioja",
  "Ciudad Autónoma de Ceuta": "Ceuta",
  "Ciudad Autónoma de Melilla": "Melilla",
};
const ALL_CCAA = [...new Set(Object.values(CCAA_ATLAS))].sort((a, b) => a.localeCompare(b, "es"));

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const THIS_YEAR = TODAY.getFullYear();
const IN_12M = new Date(TODAY); IN_12M.setFullYear(IN_12M.getFullYear() + 1);

const state = { mode: "proximos", ccaa: "", q: "", tema: "", tbd: true, rank: "racha" };
let DATA = [];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const parseDate = (s) => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };

/* ---------- Datos derivados ---------- */

function enrich(h) {
  const years = [...new Set(h.ediciones.filter((e) => e.anio <= THIS_YEAR && !isFutureEdition(e)).map((e) => e.anio))].sort((a, b) => a - b);
  // Rachas
  let max = 0, run = 0, prev = null;
  for (const y of years) { run = prev !== null && y === prev + 1 ? run + 1 : 1; max = Math.max(max, run); prev = y; }
  const last = years.at(-1);
  let current = 0;
  if (last !== undefined && last >= THIS_YEAR - 1) {
    current = 1;
    for (let i = years.length - 2; i >= 0 && years[i] === years[i + 1] - 1; i--) current++;
  }
  // Próxima edición
  const p = h.proxima;
  let next = null;
  if (p) {
    const start = parseDate(p.inicio || p.mes_estimado);
    const end = parseDate(p.fin || p.inicio) || start;
    if (start && (p.inicio ? end >= TODAY : endOfMonth(start) >= TODAY)) {
      next = { ...p, start, end, exact: !!p.inicio && p.confirmada !== false };
    }
  }
  return { ...h, years, streak: current, maxStreak: max, total: years.length, first: years[0] ?? null, next };
}
function isFutureEdition(e) { const d = parseDate(e.inicio); return d ? d > TODAY : false; }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function inNext12(h) { return h.next && h.next.start <= IN_12M; }

/* ---------- Render: cabecera ---------- */

function renderStats() {
  const upcoming = DATA.filter(inNext12);
  const regions = new Set(upcoming.map((h) => h.ccaa));
  const cities = new Set(upcoming.map((h) => h.ciudad));
  const longest = d3.max(DATA, (h) => h.streak) || 0;
  $("#stats").innerHTML = [
    [upcoming.length, `hackathones en los próximos 12 meses · ${upcoming.filter((h) => h.next.exact).length} con fecha confirmada`],
    [`${regions.size}/${ALL_CCAA.length}`, "comunidades con alguno"],
    [cities.size, "ciudades"],
    [longest, "años de la racha activa más larga"],
  ].map(([n, l]) => `<li><strong>${n}</strong><span>${l}</span></li>`).join("");

  // Panel "Lo siguiente": los próximos con fecha confirmada
  const next = DATA.filter((h) => h.next?.exact).sort((a, b) => a.next.start - b.next.start).slice(0, 4);
  const nextEl = $("#next-up");
  if (nextEl) nextEl.innerHTML = next.map((h) =>
    `<li><div class="date-box"><b>${h.next.start.getDate()}</b><span>${MESES[h.next.start.getMonth()]}</span></div><div><b><a href="${esc(h.web)}" target="_blank" rel="noopener">${esc(h.nombre)}</a></b><small>${esc(h.ciudad)} · ${fmtRange(h.next)}</small></div></li>`
  ).join("");
}

/* ---------- Render: listado ---------- */

function filtered() {
  const q = state.q.trim().toLowerCase();
  return DATA.filter((h) => h.next)
    .filter((h) => state.tbd || h.next.exact)
    .filter((h) => !state.ccaa || h.ccaa === state.ccaa)
    .filter((h) => !state.tema || (h.tematica || []).includes(state.tema))
    .filter((h) => !q || [h.nombre, h.ciudad, h.provincia, h.ccaa, h.organizador, ...(h.tematica || [])].join(" ").toLowerCase().includes(q))
    .sort((a, b) => a.next.start - b.next.start || (b.next.exact - a.next.exact));
}

function fmtRange(n) {
  if (!n.exact) return `Sin confirmar · normalmente en ${MESES_LARGO[n.start.getMonth()]} ${n.start.getFullYear()}`;
  const s = n.start, e = n.end;
  if (+s === +e) return `${s.getDate()} ${MESES_LARGO[s.getMonth()]} ${s.getFullYear()}`;
  if (s.getMonth() === e.getMonth()) return `${s.getDate()}-${e.getDate()} ${MESES_LARGO[s.getMonth()]} ${s.getFullYear()}`;
  return `${s.getDate()} ${MESES[s.getMonth()]} - ${e.getDate()} ${MESES[e.getMonth()]} ${e.getFullYear()}`;
}

function renderList() {
  const list = filtered();
  const box = $("#event-list");
  const exact = list.filter((h) => h.next.exact).length;
  $("#list-count").textContent = `${list.length} hackathones · ${exact} con fecha confirmada${state.ccaa ? ` · ${state.ccaa}` : ""}`;
  $("#f-reset").hidden = !(state.ccaa || state.q || state.tema || !state.tbd);
  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No hay hackathones próximos con estos filtros${state.ccaa ? ` en ${esc(state.ccaa)}` : ""}.<br>¿Conoces alguno? Añádelo al repositorio.</div>`;
    return;
  }
  let lastMonth = "";
  box.innerHTML = list.map((h) => {
    const n = h.next;
    const mk = `${n.start.getFullYear()}-${n.start.getMonth()}`;
    const header = mk !== lastMonth ? `<div class="month-label">${MESES_LARGO[n.start.getMonth()]} ${n.start.getFullYear()}</div>` : "";
    lastMonth = mk;
    const dateBox = n.exact
      ? `<div class="date-box"><b>${n.start.getDate()}</b><span>${MESES[n.start.getMonth()]}</span></div>`
      : `<div class="date-box tbd"><b>?</b><span>${MESES[n.start.getMonth()]}</span></div>`;
    const meta = [
      `${esc(h.ciudad)}${h.ccaa !== h.ciudad ? `, ${esc(h.ccaa)}` : ""}`,
      fmtRange(n),
      h.duracion_h ? `${h.duracion_h} h` : "",
      h.participantes ? `~${h.participantes} participantes` : "",
    ].filter(Boolean).map((m) => `<span>${m}</span>`).join("");
    const tags = (h.tematica || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("") +
      (!n.exact ? `<span class="tag warn">fecha estimada</span>` : "");
    const streak = h.streak > 1 ? `<div class="streak"><b>${h.streak}</b>años seguidos</div>`
      : `<div class="streak"><b>${h.total + 1}ª</b>edición</div>`;
    return `${header}<article class="event">${dateBox}<div><h4><a href="${esc(h.web)}" target="_blank" rel="noopener">${esc(h.nombre)}</a></h4><div class="meta">${meta}</div>${h.notas ? `<p class="note">${esc(h.notas)}</p>` : ""}<div class="tags">${tags}</div></div>${streak}</article>`;
  }).join("");
}

/* ---------- Render: mapa ---------- */

let mapCtx = null;

function countsByRegion() {
  const src = state.mode === "proximos" ? DATA.filter(inNext12) : DATA;
  const m = new Map(ALL_CCAA.map((c) => [c, []]));
  for (const h of src) if (m.has(h.ccaa)) m.get(h.ccaa).push(h);
  return m;
}

function colorFor(n, max) {
  if (!n) return "var(--empty)";
  const steps = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
  if (max <= 5) return steps[Math.min(n, 5) - 1];
  return steps[Math.min(4, Math.floor(((n - 1) / max) * 5))];
}

async function setupMap() {
  const topo = await fetch("data/spain-ccaa.json").then((r) => r.json());
  const fc = topojson.feature(topo, topo.objects.autonomous_regions);
  fc.features = fc.features.filter((f) => CCAA_ATLAS[f.properties.name]);
  // Península, Ceuta y Melilla (sin Canarias ni Baleares)
  const W = 800, H = 660;
  const projection = d3.geoConicConformal().parallels([36, 43]).rotate([3.5, 0]).fitExtent([[4, 4], [W - 4, H - 4]], fc);
  const path = d3.geoPath(projection);
  const svg = d3.select("#map").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g");
  const regions = g.selectAll("path").data(fc.features).join("path")
    .attr("class", "region").attr("d", path)
    .on("click", (ev, d) => selectRegion(CCAA_ATLAS[d.properties.name]))
    .on("mousemove", (ev, d) => showTip(ev, CCAA_ATLAS[d.properties.name]))
    .on("mouseleave", () => ($("#tooltip").hidden = true));
  const labels = svg.append("g");
  const dots = svg.append("g");
  mapCtx = { svg, projection, path, regions, labels, dots, fc };
}

function showTip(ev, name) {
  const items = countsByRegion().get(name) || [];
  const tip = $("#tooltip");
  const box = $(".map-box").getBoundingClientRect();
  tip.innerHTML = `<b>${esc(name)}</b>${items.length ? items.map((h) => esc(h.nombre)).join("<br>") : "Ninguno"}`;
  tip.hidden = false;
  const x = Math.min(ev.clientX - box.left + 14, box.width - 250);
  tip.style.left = `${Math.max(0, x)}px`;
  tip.style.top = `${ev.clientY - box.top + 14}px`;
}

function renderMap() {
  if (!mapCtx) return;
  const counts = countsByRegion();
  const max = d3.max([...counts.values()], (a) => a.length) || 1;
  mapCtx.regions
    .attr("fill", (d) => colorFor(counts.get(CCAA_ATLAS[d.properties.name])?.length || 0, max))
    .classed("selected", (d) => CCAA_ATLAS[d.properties.name] === state.ccaa);

  // Número sobre cada comunidad con hackathones
  const withN = mapCtx.fc.features.filter((f) => (counts.get(CCAA_ATLAS[f.properties.name]) || []).length);
  mapCtx.labels.selectAll("text").data(withN, (d) => d.properties.name).join("text")
    .attr("class", "region-label")
    .attr("transform", (d) => `translate(${mapCtx.path.centroid(d)})`)
    .attr("dy", "0.35em")
    .text((d) => counts.get(CCAA_ATLAS[d.properties.name]).length);

  // Leyenda
  const steps = max <= 5 ? d3.range(1, max + 1) : [1, 2, 3, 4, 5].map((i) => Math.ceil((i * max) / 5));
  $("#legend").innerHTML = `<span>0</span><span class="sw"><i style="background:var(--empty)"></i></span>
    <span class="sw">${steps.map((n) => `<i style="background:${colorFor(n, max)}" title="${n}"></i>`).join("")}</span><span>${max}</span>`;
  $("#map-sub").textContent = state.mode === "proximos"
    ? "Con edición en los próximos 12 meses, confirmada o estimada."
    : "Todos los hackathones registrados, tengan o no fecha.";

  // Lista lateral
  const rows = [...counts.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "es"));
  $("#region-list").innerHTML = rows.map(([name, arr]) =>
    `<li data-ccaa="${esc(name)}" class="${arr.length ? "" : "zero"} ${name === state.ccaa ? "selected" : ""}"><span>${esc(name)}</span><span class="n">${arr.length}</span>${arr.length ? `<span class="bar" style="width:${(arr.length / max) * 100}%"></span>` : ""}</li>`
  ).join("");
}

function selectRegion(name) {
  state.ccaa = state.ccaa === name ? "" : name;
  $("#f-ccaa").value = state.ccaa;
  renderMap(); renderList();
}

/* ---------- Render: rankings ---------- */

function renderRanking() {
  const cfg = {
    racha: { key: (h) => h.streak, unit: "años", sub: (h) => h.years.length ? `desde ${h.years.at(-1) - h.streak + 1}` : "" },
    max: { key: (h) => h.maxStreak, unit: "años", sub: (h) => `${h.total} ediciones en total` },
    total: { key: (h) => h.total, unit: "ediciones", sub: (h) => h.first ? `desde ${h.first}` : "" },
    veterania: { key: (h) => (h.first ? THIS_YEAR - h.first + 1 : 0), unit: "años", sub: (h) => h.first ? `1ª edición en ${h.first}` : "" },
  }[state.rank];
  const rows = DATA.map((h) => ({ h, v: cfg.key(h) })).filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v || b.h.total - a.h.total || a.h.nombre.localeCompare(b.h.nombre, "es")).slice(0, 15);
  const max = rows[0]?.v || 1;
  let pos = 0, prevV = null;
  $("#ranking").innerHTML = rows.map((r, i) => {
    if (r.v !== prevV) pos = i + 1; prevV = r.v;
    const unv = r.h.ediciones.some((e) => e.verificada === false) ? " · incluye años sin verificar" : "";
    return `<li><span class="pos">${pos}</span><span class="name"><b>${esc(r.h.nombre)}</b><span>${esc(r.h.ciudad)} · ${esc(cfg.sub(r.h))}${unv}</span></span><span class="track"><span class="fill" style="width:${(r.v / max) * 100}%"></span></span><span class="val">${r.v}<small>${cfg.unit}</small></span></li>`;
  }).join("");
}

/* ---------- Render: histórico ---------- */

function renderTimeline() {
  const withYears = DATA.filter((h) => h.ediciones.length);
  const minY = d3.min(withYears, (h) => d3.min(h.ediciones, (e) => e.anio));
  const maxY = Math.max(THIS_YEAR + 1, d3.max(withYears, (h) => d3.max(h.ediciones, (e) => e.anio)));
  const years = d3.range(minY, maxY + 1);
  const el = $("#timeline");
  el.style.gridTemplateColumns = `auto repeat(${years.length}, 18px)`;
  const sorted = [...withYears].sort((a, b) => (a.first ?? 9999) - (b.first ?? 9999) || a.nombre.localeCompare(b.nombre, "es"));
  let html = `<span></span>${years.map((y) => `<span class="yr">${y}</span>`).join("")}`;
  for (const h of sorted) {
    const byYear = new Map(h.ediciones.map((e) => [e.anio, e]));
    html += `<span class="row-name">${esc(h.nombre)}</span>`;
    html += years.map((y) => {
      const e = byYear.get(y);
      const nextY = h.next?.start.getFullYear() === y && !e;
      if (!e && !nextY) return `<span class="cell" title="${y}: sin edición"></span>`;
      if (nextY || isFutureEdition(e)) return `<span class="cell future" title="${y}: próxima edición"></span>`;
      const cls = e.verificada === false ? "unverified" : e.formato === "online" ? "online" : "on";
      const label = e.verificada === false ? "sin verificar" : e.formato === "online" ? "online" : e.formato === "presencial" ? "presencial" : "edición celebrada";
      return `<span class="cell ${cls}" title="${y}: ${label}"></span>`;
    }).join("");
  }
  el.innerHTML = html;
}

/* ---------- Eventos ---------- */

function bind() {
  document.querySelectorAll("#mapa .seg button").forEach((b) => b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    document.querySelectorAll("#mapa .seg button").forEach((x) => x.classList.toggle("active", x === b));
    renderMap();
  }));
  document.querySelectorAll("#rank-tabs button").forEach((b) => b.addEventListener("click", () => {
    state.rank = b.dataset.rank;
    document.querySelectorAll("#rank-tabs button").forEach((x) => x.classList.toggle("active", x === b));
    renderRanking();
  }));
  $("#region-list").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) selectRegion(li.dataset.ccaa); });
  $("#f-q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
  $("#f-ccaa").addEventListener("change", (e) => { state.ccaa = e.target.value; renderList(); renderMap(); });
  $("#f-tema").addEventListener("change", (e) => { state.tema = e.target.value; renderList(); });
  $("#f-tbd").addEventListener("change", (e) => { state.tbd = e.target.checked; renderList(); });
  $("#f-reset").addEventListener("click", () => {
    Object.assign(state, { ccaa: "", q: "", tema: "", tbd: true });
    $("#f-q").value = ""; $("#f-ccaa").value = ""; $("#f-tema").value = ""; $("#f-tbd").checked = true;
    renderList(); renderMap();
  });
}

async function main() {
  const json = await fetch("data/hackathones.json").then((r) => r.json());
  DATA = json.hackathones.map(enrich);
  $("#updated").textContent = new Date(json.actualizado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  $("#f-ccaa").innerHTML += ALL_CCAA.map((c) => `<option>${esc(c)}</option>`).join("");
  const temas = [...new Set(DATA.flatMap((h) => h.tematica || []))].sort((a, b) => a.localeCompare(b, "es"));
  $("#f-tema").innerHTML += temas.map((t) => `<option>${esc(t)}</option>`).join("");
  bind();
  renderStats(); renderList(); renderRanking(); renderTimeline();
  try { await setupMap(); renderMap(); } catch (err) { console.error(err); $("#map-sub").textContent = "No se pudo cargar el mapa."; }
}

main().catch((err) => { console.error(err); document.querySelector("main").insertAdjacentHTML("afterbegin", `<div class="card">Error cargando los datos: ${esc(err.message)}</div>`); });
