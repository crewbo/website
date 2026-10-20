// Every Bo comes from the brand's reference component (brand/, copied
// unchanged by scripts/sync-brand.sh). This file plays the page's little
// films: the hero, the setup terminal, one clip per feature, and the crew
// in the footer. Each runs only while it is on screen and the tab is
// visible; with reduced motion each shows one still, meaningful frame.
import { boSVG, panelView, sceneSVG, teamColor } from "./brand/reference/component/bo.js";

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
  loop(demo, [3500, 3500, 3500, 3500], (step) => {
    demo.dataset.step = String(step + 1);
    for (const [name, m] of Object.entries(members)) {
      drawRow(demo.querySelector(`[data-row="${name}"]`), m.steps[step], m.color, m.status[step]);
    }
    tag.hidden = !holder[step];
    demo.querySelector("[data-who]").textContent = holder[step] ? "RI" : "";
    demo.querySelector("[data-bar]").textContent = bar[step];
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

// The footer: eight Bos asleep, waking one by one in their teammate
// colours when you reach the bottom; hovering one makes it start working.
{
  const line = document.getElementById("crewline");
  const face = (i, state) => boSVG({ state, color: color(i), size: 64, theme: "light" });
  const slots = Array.from({ length: 8 }, (_, i) => {
    const el = document.createElement("span");
    el.className = "bo-slot";
    el.innerHTML = reduce ? face(i, "idle") : sceneSVG({ scene: "offline", size: 64 });
    if (reduce) el.dataset.awake = "1";
    el.addEventListener("mouseenter", () => { if (el.dataset.awake) el.innerHTML = face(i, "working"); });
    el.addEventListener("mouseleave", () => { if (el.dataset.awake) el.innerHTML = face(i, "idle"); });
    line.append(el);
    return el;
  });
  let woke = reduce;
  whenVisible(line, async () => {
    if (woke) return;
    woke = true;
    for (const [i, el] of slots.entries()) {
      await sleep(180);
      el.dataset.awake = "1";
      el.innerHTML = face(i, "idle");
    }
  }, () => {});
}
