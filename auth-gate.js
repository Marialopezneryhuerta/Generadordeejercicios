(function () {
  const FREE_LIMIT = 3;
  const STORAGE_KEY = "ej_guest_generate_count";
  const LOGIN_URL = "https://generador-de-ejercitarios.onrender.com/auth.html?tab=login";

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
    const next = encodeURIComponent(window.location.href);
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

      const ok = await canGenerateNow();
      if (!ok) return;

      button.dataset.authBypass = "1";
      button.click();
    },
    true
  );
})();
