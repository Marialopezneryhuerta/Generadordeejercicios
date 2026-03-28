const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const { listUsers, deduplicateUsersByEmail } = require("./store/usersStore");

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("Falta JWT_SECRET en backend/.env");
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const adminKey = process.env.ADMIN_DASHBOARD_KEY || "";

const oneLevelUp = path.resolve(__dirname, "..");
const twoLevelsUp = path.resolve(__dirname, "..", "..");
const rootDir = fs.existsSync(path.join(oneLevelUp, "auth.html")) ? oneLevelUp : twoLevelsUp;

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "generador-v132-backend" });
});

app.use("/api/auth", authRoutes);

app.get("/api/admin/users", async (req, res) => {
  if (!adminKey) {
    return res.status(503).json({ error: "ADMIN_DASHBOARD_KEY no configurada en el servidor" });
  }

  if (req.headers["x-admin-key"] !== adminKey) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const users = await listUsers();
  const safeUsers = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({ users: safeUsers, total: safeUsers.length });
});

app.post("/api/admin/users/deduplicate", async (req, res) => {
  if (!adminKey) {
    return res.status(503).json({ error: "ADMIN_DASHBOARD_KEY no configurada en el servidor" });
  }

  if (req.headers["x-admin-key"] !== adminKey) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const result = await deduplicateUsersByEmail();
  return res.status(200).json(result);
});

app.use(express.static(rootDir));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
