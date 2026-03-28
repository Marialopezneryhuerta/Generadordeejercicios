const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail, findById } = require("../store/usersStore");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const COOKIE_NAME = "session_token";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOptions() {
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: oneWeekMs
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt
  };
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Completa nombre, email y password" });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Email invalido" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "El password debe tener al menos 8 caracteres" });
  }

  const existing = await findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({
    name: name.trim(),
    email: email.trim(),
    passwordHash
  });

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.status(201).json({ user: toSafeUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Completa email y password" });
  }

  const user = await findByEmail(email.trim());
  if (!user) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.status(200).json({ user: toSafeUser(user) });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.status(200).json({ ok: true });
});

router.get("/me", authRequired, async (req, res) => {
  const user = await findById(req.auth.sub);

  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  return res.status(200).json({ user: toSafeUser(user) });
});

module.exports = router;
