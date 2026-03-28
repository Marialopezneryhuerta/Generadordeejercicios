const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  const token = req.cookies?.session_token;

  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Sesion invalida o expirada" });
  }
}

module.exports = { authRequired };
