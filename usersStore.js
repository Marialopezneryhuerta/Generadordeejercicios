const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { supabase, isSupabaseEnabled } = require("./supabaseClient");

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
  if (isSupabaseEnabled) {
    const normalized = email.toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.password_hash,
      role: data.role,
      subscriptionStatus: data.subscription_status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findById(id) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.password_hash,
      role: data.role,
      subscriptionStatus: data.subscription_status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

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
  if (isSupabaseEnabled) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      subscriptionStatus: row.subscription_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  const users = await readUsers();
  return users;
}

function withWriteLock(task) {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

async function createUserUnique({ name, email, passwordHash }) {
  if (isSupabaseEnabled) {
    const normalizedEmail = email.toLowerCase();
    const payload = {
      name,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: "user",
      subscription_status: "free"
    };

    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      const msg = String(error.message || "");
      if (error.code === "23505" || msg.toLowerCase().includes("duplicate key")) {
        const existing = await findByEmail(normalizedEmail);
        return { created: false, user: existing };
      }
      throw error;
    }

    return {
      created: true,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role,
        subscriptionStatus: data.subscription_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    };
  }

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
  if (isSupabaseEnabled) {
    return { removed: 0, total: (await listUsers()).length };
  }

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
