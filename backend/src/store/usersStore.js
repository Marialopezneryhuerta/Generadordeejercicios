const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

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

module.exports = {
  findByEmail,
  findById,
  createUser
};
