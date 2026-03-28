const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
let writeQueue = Promise.resolve();

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

async function readUsers() {
  await ensureStorage();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeUsers(users) {
  await ensureStorage();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function findByEmail(email) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findById(id) {
  const users = await readUsers();
  return users.find((user) => user.id === id) || null;
}

async function createUser({ name, email, passwordHash }) {
  const users = await readUsers();
  const now = new Date().toISOString();

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "user",
    subscriptionStatus: "free",
    createdAt: now,
    updatedAt: now
  };

  users.push(newUser);
  await writeUsers(users);

  return newUser;
}

async function listUsers() {
  const users = await readUsers();
  return users;
}

function withWriteLock(task) {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

async function createUserUnique({ name, email, passwordHash }) {
  return withWriteLock(async () => {
    const users = await readUsers();
    const normalizedEmail = email.toLowerCase();
    const existing = users.find((user) => user.email.toLowerCase() === normalizedEmail);

    if (existing) {
      return { created: false, user: existing };
    }

    const now = new Date().toISOString();
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email: normalizedEmail,
      passwordHash,
      role: "user",
      subscriptionStatus: "free",
      createdAt: now,
      updatedAt: now
    };

    users.push(newUser);
    await writeUsers(users);

    return { created: true, user: newUser };
  });
}

async function deduplicateUsersByEmail() {
  return withWriteLock(async () => {
    const users = await readUsers();
    const map = new Map();
    let removed = 0;

    // Conserva el usuario mas antiguo por email.
    const sorted = [...users].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const user of sorted) {
      const key = user.email.toLowerCase();
      if (!map.has(key)) {
        map.set(key, user);
      } else {
        removed += 1;
      }
    }

    const deduped = Array.from(map.values());
    if (removed > 0) {
      await writeUsers(deduped);
    }

    return { removed, total: deduped.length };
  });
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  listUsers,
  createUserUnique,
  deduplicateUsersByEmail
};
