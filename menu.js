/* === MENU / BURGER === */
const burger = document.querySelector(".burger");
const nav = document.querySelector("nav");
const menu = document.getElementById("main-menu");

if (burger && nav && menu) {
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = nav.classList.toggle("active");
    burger.classList.toggle("active", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && nav.classList.contains("active")) {
      nav.classList.remove("active");
      burger.classList.remove("active");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("active");
      burger.classList.remove("active");
      burger.setAttribute("aria-expanded", "false");
    })
  );
}

/* === WAKE LOCK (NoSleep fallback) === */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("kitchenBtn");
  if (!btn) return;

  let wakeLock = null;
  let noSleep = window.NoSleep ? new NoSleep() : { enable() {}, disable() {} };
  let active = false;

  async function enableWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          active = false;
          btn.textContent = "Hold min skærm tændt";
        });
        active = true;
      } catch (err) {
        console.error("Kunne ikke aktivere Wake Lock:", err);
      }
    } else {
      noSleep.enable();
      active = true;
    }
  }

  async function disableWakeLock() {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
    if (noSleep && noSleep.disable) noSleep.disable();
    active = false;
  }

  btn.addEventListener("click", async () => {
    if (!active) {
      await enableWakeLock();
      btn.textContent = "Sluk skærmlås";
    } else {
      await disableWakeLock();
      btn.textContent = "Hold min skærm tændt";
    }
  });

  document.addEventListener("visibilitychange", async () => {
    if (
      document.visibilityState === "visible" &&
      active &&
      "wakeLock" in navigator &&
      !wakeLock
    ) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.warn("Kunne ikke genanmode Wake Lock:", err);
      }
    }
  });
});

/* === INGREDIENTS / CHECKBOX & PORTION SCALING === */
document.addEventListener("DOMContentLoaded", () => {
  const portionInput = document.getElementById("portionInput");
  const ingList = document.getElementById("ingredientList");

  if (ingList) {
    Array.from(ingList.children).forEach((li) => {
      const originalText = li.textContent.trim();
      li.textContent = "";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const span = document.createElement("span");
      span.textContent = originalText;

      li.dataset.original = originalText;
      li.appendChild(checkbox);
      li.appendChild(span);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          span.classList.add("checked");
        } else {
          span.classList.remove("checked");
        }
      });
    });
  }

  if (!portionInput || !ingList) return;

  function parseLeadingNumber(text) {
    const trimmed = text.trim();
    const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      return whole + num / den;
    }
    const fracMatch = trimmed.match(/^(\d+)\/(\d+)/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1], 10);
      const den = parseInt(fracMatch[2], 10);
      return num / den;
    }
    const decMatch = trimmed.match(/^(\d+(\.\d+)?)/);
    if (decMatch) {
      return parseFloat(decMatch[1]);
    }
    return null;
  }

  function splitAmountAndText(text) {
    const match = text
      .trim()
      .match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)(.*)/);
    if (!match) return [null, text];
    const numStr = match[1].trim();
    const rest = match[3].trim();
    const value = parseLeadingNumber(numStr);
    return [value, rest];
  }

  function renderIngredients() {
    const desired = Number(portionInput.value) || 1;
    const basePortions = 2;
    const factor = desired / basePortions;

    Array.from(ingList.children).forEach((li) => {
      const original = li.dataset.original || li.textContent;
      const span = li.querySelector("span");

      const dataBase = li.dataset.base;
      if (dataBase) {
        const baseValue = parseFloat(dataBase);
        if (!isNaN(baseValue)) {
          const [, restText] = splitAmountAndText(original);
          const scaled = baseValue * factor;
          const pretty = Number.isInteger(scaled)
            ? String(Math.round(scaled))
            : String(Number(scaled.toFixed(2)).toString());
          span.textContent = restText ? `${pretty} ${restText}` : `${pretty}`;
          return;
        }
      }

      const [num, rest] = splitAmountAndText(original);
      if (num !== null) {
        const scaled = num * factor;
        const pretty = Number.isInteger(scaled)
          ? String(Math.round(scaled))
          : String(Number(scaled.toFixed(2)).toString());
        span.textContent = rest ? `${pretty} ${rest}` : `${pretty}`;
      } else {
        span.textContent = original;
      }
    });
  }

  renderIngredients();
  portionInput.addEventListener("input", renderIngredients);
});

/* === PRINT BUTTON === */
document.getElementById("printRecipe")?.addEventListener("click", () => {
  window.print();
});

/* === SEARCH FUNCTION (FIX: vælg titel-ankeret, ikke billede-ankeret) === */
(function () {
  const input = document.getElementById("siteSearch");
  if (!input) return;

  const container = document.querySelector(".grid-a");
  if (!container) return;
  const recipes = container.querySelectorAll(".opskrift");

  function normalizeText(str) {
    return str
      ? str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
      : "";
  }

  input.addEventListener("input", () => {
    const q = normalizeText(input.value.trim());

    recipes.forEach((r) => {
      // hent alle <a> i .opskrift og vælg det sidste (titlen)
      const anchors = r.querySelectorAll("a");
      let titleEl = null;

      if (anchors.length === 1) {
        titleEl = anchors[0];
      } else if (anchors.length > 1) {
        // normalt er billedet først og titlen sidst i din markup
        titleEl = anchors[anchors.length - 1];
      }

      // fallback: hvis der er et element med synlig tekst (fx et .recipe-title eller h3), brug det
      if (!titleEl) {
        titleEl =
          r.querySelector("[data-title]") ||
          r.querySelector(".recipe-title") ||
          r.querySelector("h3") ||
          r;
      }

      const title = normalizeText(titleEl ? titleEl.textContent : "");

      if (title.includes(q) || q === "") {
        r.style.display = "";
      } else {
        r.style.display = "none";
      }
    });
  });
})();

/* === STRIKETHROUGH FOR INSTRUCTIONS (beholder din originale opførsel) === */
document
  .querySelectorAll(".instrukser input[type='checkbox']")
  .forEach((cb) => {
    cb.addEventListener("change", () => {
      const label = cb.parentElement;
      if (cb.checked) {
        label.style.textDecoration = "line-through";
        label.style.opacity = "0.6";
      } else {
        label.style.textDecoration = "none";
        label.style.opacity = "1";
      }
    });
  });
