(function () {
  const FREE_LIMIT = 3;
  const STORAGE_KEY = "ej_guest_generate_count";
  const LOGIN_URL = "https://generador-de-ejercitarios.onrender.com/auth.html?tab=login";
  const APP_ORIGIN = "https://generador-de-ejercitarios.onrender.com";

  let mePromise = null;

  async function isLoggedIn() {
    if (!mePromise) {
      mePromise = fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
        .then((res) => res.ok)
        .catch(() => false);
    }
    return mePromise;
  }

  function getGuestCount() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = Number(raw || "0");
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function setGuestCount(value) {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(value))));
  }

  function redirectToLogin() {
    const nextPath = window.location.pathname + window.location.search + window.location.hash;
    const next = encodeURIComponent(APP_ORIGIN + nextPath);
    window.location.href = LOGIN_URL + "&next=" + next;
  }

  async function canGenerateNow() {
    const logged = await isLoggedIn();
    if (logged) return true;

    const used = getGuestCount();
    if (used >= FREE_LIMIT) {
      alert("Ya usaste tus 3 ejercitarios gratis. Inicia sesion o registrate para continuar.");
      redirectToLogin();
      return false;
    }

    setGuestCount(used + 1);
    return true;
  }

  function textOf(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function inferRama() {
    const h1 = document.querySelector(".hero h1");
    if (h1 && textOf(h1)) return textOf(h1);
    const file = (window.location.pathname.split("/").pop() || "sin-rama").replace(".html", "");
    return file;
  }

  function inferTema(button) {
    const panel = button.closest(".section-panel, [id$='-section'], [id^='panel-']") || document.body;
    const active = panel.querySelector(".topic-btn.active, .subtype-btn.active");
    if (active && textOf(active)) return textOf(active);

    const localCardTitle = button.closest(".card")?.querySelector(".card-title");
    if (localCardTitle && textOf(localCardTitle)) return textOf(localCardTitle);

    if (panel.id) return panel.id;
    return "tema-general";
  }

  function visible(el) {
    return !!(el && (el.offsetParent || el.getClientRects().length));
  }

  function inferNiveles(button) {
    const panel = button.closest(".section-panel, [id$='-section'], [id^='panel-']") || document.body;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // 1) Estructura explicita data-level + lq-val (la mas comun en tus modulos)
    const levelItems = Array.from(panel.querySelectorAll(".level-item[data-level]")).filter(visible);
    for (const item of levelItems) {
      const level = Number(item.getAttribute("data-level"));
      if (!(level >= 1 && level <= 5)) continue;
      const valNode = item.querySelector(".lq-val");
      const val = Number((valNode?.textContent || "0").trim());
      if (Number.isFinite(val) && val > 0) counts[level] += val;
    }

    // 2) Fallback por id (co-lqv-1, lin-lqv-3, etc.)
    const nodes = Array.from(panel.querySelectorAll("[id*='lqv-']")).filter(visible);
    for (const node of nodes) {
      const match = (node.id || "").match(/lqv-(\d+)/i);
      if (!match) continue;
      const level = Number(match[1]);
      if (!(level >= 1 && level <= 5)) continue;
      const val = Number((node.textContent || "0").trim());
      if (Number.isFinite(val) && val > 0) counts[level] = Math.max(counts[level], val);
    }

    return counts;
  }

  async function trackUsage(button, loggedIn) {
    const payload = {
      rama: inferRama(),
      tema: inferTema(button),
      niveles: inferNiveles(button),
      sourcePath: window.location.pathname,
      isLoggedIn: !!loggedIn
    };

    try {
      await fetch("/api/usage/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {
      // No bloquear la generacion si falla el tracking.
    }
  }

  document.addEventListener(
    "click",
    async function (event) {
      const button = event.target.closest(".btn-generate");
      if (!button || button.disabled) return;

      if (button.dataset.authBypass === "1") {
        button.dataset.authBypass = "0";
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const loggedIn = await isLoggedIn();
      const ok = loggedIn || (await canGenerateNow());
      if (!ok) return;

      trackUsage(button, loggedIn);

      button.dataset.authBypass = "1";
      button.click();
    },
    true
  );
})();
