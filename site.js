// Draws every Bo with the brand's reference component (brand/, copied
// unchanged by scripts/sync-brand.sh) and plays the hero's story: what
// Crewbo does today, step by step, from ronel's editor.
import { boSVG, panelView, sceneSVG, teamColor } from "./brand/reference/component/bo.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const color = (i) => teamColor(Number(i)).base;

// Static Bos: [data-scene] and [data-state] slots in the page.
for (const el of document.querySelectorAll("[data-scene]")) {
  el.innerHTML = sceneSVG({ scene: el.dataset.scene, color: color(el.dataset.color), size: 96 });
}
for (const el of document.querySelectorAll(".card [data-state]")) {
  el.innerHTML = boSVG({ state: el.dataset.state, color: color(el.dataset.color), size: 64, theme: "light" });
}

// The hero. Each member: colour index and, per step, the crew row's input
// to panelView plus the status line, as the extension's crewRows writes it.
const idle = { online: true, activity: "none" };
const writing = { online: true, activity: "editing" };
const asking = { online: true, handoffPending: true, activity: "none" };
const members = {
  ronel: { color: 0, steps: [idle, idle, asking, writing], status: ["Idle", "Idle", "ronel wants src/auth.go next", "Writing auth.go"] },
  riya: { color: 1, steps: [writing, writing, asking, idle], status: ["Writing auth.go", "Writing auth.go", "ronel wants src/auth.go next", "Idle"] },
  arjun: { color: 3, steps: [idle, idle, idle, idle] },
  meera: { steps: [{ online: false }, { online: false }, { online: false }, { online: false }] },
};
// The claim tag and explorer initials name riya while she holds the file;
// the extension never tags your own claims, so they go once ronel has it.
const holder = ["riya", "riya", "riya", null];
// The status bar (the extension's statusText): one claim throughout, and
// ronel's open request while it waits.
const bar = ["crewbo  1 claimed · 0 handoff · 0 conflicts", "crewbo  1 claimed · 0 handoff · 0 conflicts", "crewbo  1 claimed · 1 handoff · 0 conflicts", "crewbo  1 claimed · 0 handoff · 0 conflicts"];

const demo = document.getElementById("demo");
const tag = demo.querySelector("[data-tag]");
const initials = demo.querySelector("[data-who]");
const status = demo.querySelector("[data-bar]");
tag.style.setProperty("--tag-base", teamColor(1).base);

const drawn = new Map(); // row to the key of what it shows, so Bo's motion only restarts when it changes
function show(step) {
  demo.dataset.step = String(step + 1);
  for (const [name, m] of Object.entries(members)) {
    const row = demo.querySelector(`[data-row="${name}"]`);
    const input = m.steps[step];
    const v = panelView(input);
    const c = input.online ? color(m.color) : undefined;
    const key = JSON.stringify(v);
    if (drawn.get(name) !== key) {
      drawn.set(name, key);
      row.querySelector("[data-bo]").innerHTML = v.kind === "scene"
        ? sceneSVG({ scene: v.scene, color: c, size: 64 })
        : boSVG({ state: v.state, color: c, size: 64, theme: "light" });
    }
    if (m.status) row.querySelector("[data-status]").textContent = m.status[step];
  }
  const h = holder[step];
  tag.hidden = !h;
  initials.textContent = h ? h.slice(0, 2).toUpperCase() : "";
  status.textContent = bar[step];
}

// Four steps of 3.5 s, paused while the hero is off screen or the tab is
// hidden. With reduced motion: the key step (the refused edit), still.
const stepMs = 3500;
let step;
let timer;
let onScreen = true;
const run = () => {
  clearInterval(timer);
  if (reduce.matches || !onScreen || document.hidden) return;
  timer = setInterval(() => { step = (step + 1) % 4; show(step); }, stepMs);
};
step = reduce.matches ? 1 : 0;
show(step);
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(demo);
document.addEventListener("visibilitychange", run);
reduce.addEventListener("change", () => { step = 1; show(step); run(); });
