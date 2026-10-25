// Every Bo comes from the brand's reference component (brand/, copied
// unchanged by scripts/sync-brand.sh). This file plays the page's little
// films: the hero, the setup terminal, one clip per feature, and the crew
// in the footer. Each runs only while it is on screen and the tab is
// visible; with reduced motion each shows one still, meaningful frame.
import { INK, boSVG, markSVG, panelView, sceneSVG, teamColor } from "./brand/reference/component/bo.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const color = (i) => teamColor(Number(i)).base;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// whenVisible calls start when el comes on screen (and the tab is shown)
// and stop when it leaves.
function whenVisible(el, start, stop) {
  let on = false;
  let seen = false;
  const update = () => {
    const next = seen && !document.hidden;
    if (next !== on) (on = next) ? start() : stop();
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; update(); }, { threshold: 0.3 }).observe(el);
  document.addEventListener("visibilitychange", update);
}

// loop steps through the durations while el is visible; with reduced
// motion it shows the still step only.
function loop(el, durations, show, still) {
  let step = 0;
  let timer;
  show(reduce ? still : 0);
  if (reduce) return;
  const tick = () => {
    timer = setTimeout(() => { step = (step + 1) % durations.length; show(step); tick(); }, durations[step]);
  };
  whenVisible(el, tick, () => clearTimeout(timer));
}

// drawRow draws one crew row as the extension's crew panel does: Bo from
// panelView, the status line as crewRows writes it. Only what changed
// redraws, so Bo's own motion is not restarted on every step.
function drawRow(row, input, colorIndex, status, agent) {
  const v = panelView(input);
  const key = JSON.stringify([v, input.online && colorIndex]);
  if (row.dataset.key !== key) {
    row.dataset.key = key;
    const c = input.online ? color(colorIndex) : undefined;
    row.querySelector("[data-bo]").innerHTML = v.kind === "scene"
      ? sceneSVG({ scene: v.scene, color: c, size: 64 })
      : boSVG({ state: v.state, color: c, size: 64, theme: "light" });
  }
  const s = row.querySelector("[data-status]");
  if (s && s.textContent !== status) {
    s.textContent = status;
    s.classList.remove("changed");
    void s.offsetWidth; // restart the fade
    s.classList.add("changed");
  }
  const a = row.querySelector("[data-agent]");
  if (a && agent !== undefined) a.textContent = agent;
}

// Static Bos: [data-scene] and [data-state] slots.
for (const el of document.querySelectorAll("[data-scene]")) {
  el.innerHTML = sceneSVG({ scene: el.dataset.scene, color: color(el.dataset.color ?? 0), size: Number(el.dataset.size ?? 64) });
}
for (const el of document.querySelectorAll("[data-face]")) {
  el.innerHTML = boSVG({ state: el.dataset.face, color: color(el.dataset.color), size: Number(el.dataset.size ?? 64), theme: "light" });
}
for (const el of document.querySelectorAll(".how-item [data-state]")) {
  // Still: the stage beside them is what moves (P3, still by default).
  el.innerHTML = boSVG({ state: el.dataset.state, color: color(el.dataset.color), size: Number(el.dataset.size ?? 48), theme: "light", static: true });
}

const idle = { online: true, activity: "none" };
const writing = { online: true, activity: "editing" };
const asking = { online: true, handoffPending: true, activity: "none" };
const clash = { online: true, conflict: true, activity: "none" };
const asleep = { online: false };

// The hero: the Crewbo IDE as ronel sees it, in four steps.
{
  const demo = document.getElementById("demo");
  const members = {
    ronel: { color: 0, steps: [idle, idle, asking, writing], status: ["Idle", "Idle", "ronel wants src/auth.go next", "Writing auth.go"] },
    riya: { color: 1, steps: [writing, writing, asking, idle], status: ["Writing auth.go", "Writing auth.go", "ronel wants src/auth.go next", "Idle"] },
    arjun: { color: 3, steps: [idle, idle, idle, idle], status: ["Idle", "Idle", "Idle", "Idle"] },
    meera: { steps: [asleep, asleep, asleep, asleep], status: ["Offline since 9:40 pm", "Offline since 9:40 pm", "Offline since 9:40 pm", "Offline since 9:40 pm"] },
  };
  // The tag and tab initials name riya while she holds the file; the
  // extension never tags your own claims. The status bar is statusText.
  const holder = ["riya", "riya", "riya", null];
  const bar = ["crewbo  1 claimed · 0 handoff · 0 conflicts", "crewbo  1 claimed · 0 handoff · 0 conflicts", "crewbo  1 claimed · 1 handoff · 0 conflicts", "crewbo  1 claimed · 0 handoff · 0 conflicts"];
  const tag = demo.querySelector("[data-tag]");
  tag.style.setProperty("--tag-base", teamColor(1).base);
  // Subtitles, in plain words, like a video's.
  const cap = demo.querySelector("[data-cap]");
  const lines = [
    "riya's Codex is editing auth.go.",
    "ronel's Claude Code tries to edit it too. Crewbo stops it and says who has the file.",
    "ronel's agent asks riya for the file.",
    "riya hands it over, and ronel's agent carries on.",
  ];
  const subtitle = (step) => {
    if (reduce) { cap.textContent = lines[step]; return; }
    cap.classList.add("swap");
    setTimeout(() => { cap.textContent = lines[step]; cap.classList.remove("swap"); }, 150);
  };
  loop(demo, [3500, 3500, 3500, 3500], (step) => {
    demo.dataset.step = String(step + 1);
    for (const [name, m] of Object.entries(members)) {
      drawRow(demo.querySelector(`[data-row="${name}"]`), m.steps[step], m.color, m.status[step]);
    }
    tag.hidden = !holder[step];
    demo.querySelector("[data-who]").textContent = holder[step] ? "RI" : "";
    demo.querySelector("[data-bar]").textContent = bar[step];
    subtitle(step);
  }, 1);
}

// The setup terminal: types each command, then shows its real output.
{
  const tabs = [...document.querySelectorAll(".agents [role=tab]")];
  const box = document.getElementById("cmd");
  const escape = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const scripts = {};
  for (const pre of box.querySelectorAll("[data-agent-cmd]")) {
    scripts[pre.dataset.agentCmd] = pre.querySelector("code").innerHTML.split("\n").map((l) => (l.startsWith("<b>$</b> ") ? { cmd: l.slice(9) } : { out: l }));
  }
  const html = (lines) => lines.map((l) => (l.cmd !== undefined ? `<b>$</b> ${l.cmd}` : l.out)).join("\n");
  const plain = (cmd) => cmd.replace(/&amp;/g, "&").replace(/&lt;/g, "<");
  let run = 0;
  async function play(agent) {
    const mine = ++run;
    const code = box.querySelector(`[data-agent-cmd="${agent}"] code`);
    const lines = scripts[agent];
    if (reduce) { code.innerHTML = html(lines); return; }
    const done = [];
    const prefix = () => html(done) + (done.length ? "\n" : "");
    for (const l of lines) {
      if (l.cmd !== undefined) {
        const text = plain(l.cmd);
        for (let i = 1; i <= text.length; i++) {
          if (mine !== run) return;
          code.innerHTML = prefix() + `<b>$</b> ${escape(text.slice(0, i))}<span class="cursor"></span>`;
          await sleep(18);
        }
        done.push(l);
        await sleep(350);
      } else {
        if (mine !== run) return;
        done.push(l);
        code.innerHTML = html(done) + `\n<span class="cursor"></span>`;
        await sleep(450);
      }
    }
    if (mine === run) code.innerHTML = html(done);
  }
  // Reserve the height of the longest script, so typing and switching tabs
  // never move the page.
  const reserve = () => {
    let tallest = 0;
    for (const t of tabs) {
      const pre = box.querySelector(`[data-agent-cmd="${t.dataset.agent}"]`);
      const { hidden } = pre;
      const code = pre.querySelector("code");
      const now = code.innerHTML;
      pre.hidden = false;
      pre.style.minHeight = "";
      code.innerHTML = html(scripts[t.dataset.agent]);
      tallest = Math.max(tallest, pre.offsetHeight);
      code.innerHTML = now;
      pre.hidden = hidden;
    }
    for (const pre of box.querySelectorAll("[data-agent-cmd]")) pre.style.minHeight = `${tallest}px`;
  };
  reserve();
  addEventListener("resize", reserve);
  const pick = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      box.querySelector(`[data-agent-cmd="${t.dataset.agent}"]`).hidden = !on;
    }
    play(tab.dataset.agent);
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => pick(t));
    t.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length];
      pick(next);
      next.focus();
    });
  });
  // Type once the box is on screen; until then it shows the full text.
  let started = false;
  whenVisible(box, () => { if (!started) { started = true; pick(tabs[0]); } }, () => {});
  const copy = document.querySelector("[data-copy]");
  copy.addEventListener("click", async () => {
    const agent = tabs.find((t) => t.getAttribute("aria-selected") === "true").dataset.agent;
    const text = scripts[agent].filter((l) => l.cmd !== undefined).map((l) => plain(l.cmd)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Select and copy";
    }
    setTimeout(() => (copy.textContent = "Copy"), 2000);
  });
}

// Feature clips: each loops its own short story.
function stepped(clip, step) {
  for (const el of clip.querySelectorAll("[data-s]")) {
    const until = el.dataset.until ? Number(el.dataset.until) : Infinity;
    el.classList.toggle("on", step >= Number(el.dataset.s) && step <= until);
  }
}
{
  const clip = document.querySelector('[data-clip="claims"]');
  loop(clip, [1200, 900, 3000, 2200], (step) => stepped(clip, step), 3);
}
{
  const clip = document.querySelector('[data-clip="handoff"]');
  clip.querySelector(".note:not(.done)").dataset.until = "2";
  const press = clip.querySelector("[data-press]");
  loop(clip, [1200, 1800, 700, 2400], (step) => {
    stepped(clip, step);
    press.classList.toggle("pressed", step === 2);
  }, 1);
}
{
  const clip = document.querySelector('[data-clip="crew"]');
  const frames = [
    { riya: [writing, "Writing auth.go"], arjun: [idle, "Idle"], meera: [asleep, "Offline since 9:40 pm", ""] },
    { riya: [writing, "Writing auth.go"], arjun: [writing, "Writing token.go"], meera: [asleep, "Offline since 9:40 pm", ""] },
    { riya: [idle, "Idle"], arjun: [writing, "Writing token.go"], meera: [idle, "Idle", "Claude Code"] },
    { riya: [writing, "Writing session.go"], arjun: [idle, "Idle"], meera: [writing, "Writing limits.go", "Claude Code"] },
  ];
  const colors = { riya: 1, arjun: 3, meera: 2 };
  loop(clip, [2400, 2400, 2400, 2400], (step) => {
    for (const [n, [input, status, agent]] of Object.entries(frames[step])) drawRow(clip.querySelector(`[data-member="${n}"]`), input, colors[n], status, agent);
  }, 1);
}
{
  const clip = document.querySelector('[data-clip="conflict"]');
  const frames = [
    { ronel: [writing, "Writing auth.go"], riya: [writing, "Writing auth.go"] },
    { ronel: [clash, "Conflict in auth.go"], riya: [clash, "Conflict in auth.go"] },
  ];
  const colors = { ronel: 0, riya: 1 };
  loop(clip, [2600, 3200], (step) => {
    for (const [n, [input, status]] of Object.entries(frames[step])) drawRow(clip.querySelector(`[data-member="${n}"]`), input, colors[n], status);
  }, 1);
}

// The hero stickers: drag any Bo; it stays where you drop it.
let stickerTop = 10;
for (const f of document.querySelectorAll("#desk .float")) {
  let start;
  f.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX, y: e.clientY, ox: parseFloat(f.style.getPropertyValue("--x")) || 0, oy: parseFloat(f.style.getPropertyValue("--y")) || 0 };
    f.setPointerCapture(e.pointerId);
    f.classList.add("dragging");
    f.style.zIndex = String(++stickerTop);
  });
  f.addEventListener("pointermove", (e) => {
    if (!start) return;
    f.style.setProperty("--x", `${start.ox + e.clientX - start.x}px`);
    f.style.setProperty("--y", `${start.oy + e.clientY - start.y}px`);
  });
  const end = () => { start = undefined; f.classList.remove("dragging"); };
  f.addEventListener("pointerup", end);
  f.addEventListener("pointercancel", end);
}

// How it works: the stage shows one item's clip at a time, moving to the
// next every 7 s; hovering or clicking an item picks it and pauses the cycle.
{
  const items = [...document.querySelectorAll(".how-item")];
  const order = ["claims", "crew", "handoff", "conflict"];
  let current = 0;
  let paused = false;
  const pick = (i) => {
    current = i;
    for (const it of items) it.classList.toggle("active", it.dataset.pick === order[i]);
    // The clips share one grid cell, so the stage is always as tall as the
    // tallest and the section never moves when the clip changes.
    for (const c of document.querySelectorAll(".stage-clip")) c.classList.toggle("active", c.dataset.clip === order[i]);
  };
  for (const it of items) {
    const i = order.indexOf(it.dataset.pick);
    it.addEventListener("mouseenter", () => { paused = true; pick(i); });
    it.addEventListener("focus", () => { paused = true; pick(i); });
    it.addEventListener("click", () => pick(i));
    it.addEventListener("mouseleave", () => { paused = false; });
  }
  pick(0);
  if (!reduce) {
    let timer;
    const grid = document.querySelector(".how-grid");
    whenVisible(grid, () => { timer = setInterval(() => { if (!paused) pick((current + 1) % order.length); }, 7000); }, () => clearInterval(timer));
  }
}

// The footer: "crewbo" spelled in the Bo mark. The marks pop in letter by
// letter when you reach the bottom; hovering one wakes it as a teammate's
// Bo, and each can be dragged and springs back.
{
  const font = {
    c: ["     ", "     ", " ####", "#    ", "#    ", "#    ", " ####"],
    r: ["     ", "     ", "# ###", "##   ", "#    ", "#    ", "#    "],
    e: ["     ", "     ", " ### ", "#   #", "#####", "#    ", " ####"],
    w: ["     ", "     ", "#   #", "#   #", "# # #", "# # #", " # # "],
    b: ["#    ", "#    ", "#### ", "#   #", "#   #", "#   #", "#### "],
    o: ["     ", "     ", " ### ", "#   #", "#   #", "#   #", " ### "],
  };
  const word = "crewbo";
  const cols = word.length * 6 - 1;
  const grid = document.getElementById("boword");
  grid.style.gridTemplateColumns = `repeat(${cols}, 24px)`;
  const marks = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < cols; col++) {
      const letter = word[Math.floor(col / 6)];
      const lc = col % 6;
      const cell = document.createElement("span");
      if (lc < 5 && font[letter][row][lc] === "#") {
        cell.innerHTML = markSVG({ size: 32 });
        cell.dataset.col = String(col);
        marks.push(cell);
      }
      grid.append(cell);
    }
  }
  let n = 0;
  for (const m of marks) {
    const tint = n++ % 8;
    m.addEventListener("mouseenter", () => { m.innerHTML = boSVG({ state: "working", color: color(tint), size: 32, theme: "light" }); });
    m.addEventListener("mouseleave", () => { m.innerHTML = markSVG({ size: 32 }); });
    let start;
    m.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY }; m.setPointerCapture(e.pointerId); m.classList.remove("back"); m.style.zIndex = "5"; m.style.position = "relative"; });
    m.addEventListener("pointermove", (e) => { if (start) m.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px)`; });
    const end = () => { if (!start) return; start = undefined; m.classList.add("back"); m.style.transform = ""; };
    m.addEventListener("pointerup", end);
    m.addEventListener("pointercancel", end);
  }
  if (reduce) {
    for (const m of marks) m.style.visibility = "visible";
  } else {
    for (const m of marks) m.style.visibility = "hidden";
    let built = false;
    whenVisible(grid, () => {
      if (built) return;
      built = true;
      for (const m of marks) {
        setTimeout(() => { m.style.visibility = "visible"; m.classList.add("on"); }, Number(m.dataset.col) * 40);
      }
    }, () => {});
  }
}

// Footer brand: as the row rises, the main mark turns into Bo (ink, the
// brand Bo's colour) for one bob, the brand's merged state, and back.
{
  const brand = document.getElementById("footbrand");
  const bo = brand.querySelector(".as-bo");
  const draw = (state) => { bo.innerHTML = boSVG({ state, color: INK, size: 168, theme: "light" }); };
  draw("idle");
  brand.addEventListener("mouseenter", () => draw(reduce ? "idle" : "merged"));
}
