const path = require("node:path");
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("Falta JWT_SECRET en backend/.env");
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDir = path.resolve(__dirname, "..", "..");

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "generador-v132-backend" });
});

app.use("/api/auth", authRoutes);
app.use(express.static(rootDir));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
