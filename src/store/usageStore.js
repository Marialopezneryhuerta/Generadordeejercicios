const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const USAGE_FILE = path.join(DATA_DIR, "usage-events.json");

let writeQueue = Promise.resolve();

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USAGE_FILE);
  } catch {
    await fs.writeFile(USAGE_FILE, "[]", "utf8");
  }
}

async function readEvents() {
  await ensureStorage();
  const raw = await fs.readFile(USAGE_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeEvents(events) {
  await ensureStorage();
  await fs.writeFile(USAGE_FILE, JSON.stringify(events, null, 2), "utf8");
}

function withWriteLock(task) {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

async function addUsageEvent(event) {
  return withWriteLock(async () => {
    const events = await readEvents();
    const now = new Date().toISOString();
    events.push({
      rama: event.rama || "sin-rama",
      tema: event.tema || "sin-tema",
      niveles: event.niveles || {},
      sourcePath: event.sourcePath || "",
      isLoggedIn: !!event.isLoggedIn,
      createdAt: now
    });
    await writeEvents(events);
    return { ok: true };
  });
}

async function getUsageSummary() {
  const events = await readEvents();
  const map = new Map();

  for (const ev of events) {
    const rama = (ev.rama || "sin-rama").trim();
    const tema = (ev.tema || "sin-tema").trim();
    const key = `${rama}|||${tema}`;

    if (!map.has(key)) {
      map.set(key, {
        rama,
        tema,
        nivel1: 0,
        nivel2: 0,
        nivel3: 0,
        nivel4: 0,
        nivel5: 0,
        totalEjercicios: 0,
        totalGeneraciones: 0
      });
    }

    const row = map.get(key);
    row.totalGeneraciones += 1;

    const n1 = Number(ev.niveles?.["1"] || ev.niveles?.[1] || 0);
    const n2 = Number(ev.niveles?.["2"] || ev.niveles?.[2] || 0);
    const n3 = Number(ev.niveles?.["3"] || ev.niveles?.[3] || 0);
    const n4 = Number(ev.niveles?.["4"] || ev.niveles?.[4] || 0);
    const n5 = Number(ev.niveles?.["5"] || ev.niveles?.[5] || 0);

    row.nivel1 += Number.isFinite(n1) ? n1 : 0;
    row.nivel2 += Number.isFinite(n2) ? n2 : 0;
    row.nivel3 += Number.isFinite(n3) ? n3 : 0;
    row.nivel4 += Number.isFinite(n4) ? n4 : 0;
    row.nivel5 += Number.isFinite(n5) ? n5 : 0;
    row.totalEjercicios = row.nivel1 + row.nivel2 + row.nivel3 + row.nivel4 + row.nivel5;
  }

  const rows = Array.from(map.values()).sort((a, b) => b.totalEjercicios - a.totalEjercicios);
  return { rows, totalEventos: events.length };
}

module.exports = {
  addUsageEvent,
  getUsageSummary
};
