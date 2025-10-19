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

/* === PRINT + TEL-FIX + FOOTER Z-INDEX FIX === */
(function () {
  // Kører ved DOMContentLoaded så elementer er tilgængelige
  document.addEventListener("DOMContentLoaded", () => {
    /* ---------- PRINT (prøv window.print() først, fallback til ny fane) ---------- */
    const printBtn = document.getElementById("printRecipe");

    function openPrintable(selector) {
      const content = document.querySelector(selector);
      if (!content) {
        alert("Opskrift ikke fundet til print.");
        return;
      }
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        alert(
          "Kunne ikke åbne print-vindue (popup blokeret). Prøv at tillade popups eller brug desktop."
        );
        return;
      }
      const html = `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Print - Opskrift</title>
<style>
  body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;color:#000;background:#fff}
  img{max-width:100%;height:auto;display:block;margin-bottom:12px}
  @media print{ body{margin:0.5cm} }
</style>
</head>
<body>
<main>${content.innerHTML}</main>
<script>window.onload=function(){ try{ window.print(); }catch(e){ console.warn(e); } }<\/script>
</body>
</html>`;
      w.document.open();
      w.document.write(html);
      w.document.close();
    }

    if (printBtn) {
      printBtn.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          window.print();
          // Hvis du altid vil bruge fallback i stedet for window.print(), uncomment næste linje:
          // openPrintable('.opskrift');
        } catch (err) {
          console.warn("window.print fejlede, bruger fallback:", err);
          openPrintable(".opskrift");
        }
      });
    }

    /* ---------- FIX tel: LINKS (hvis utilsigtet tekst i href) ---------- */
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (/^tel:/i.test(href) && /[A-Za-z]/.test(href)) {
        const visible = (a.textContent || "").trim();
        const digits = visible.replace(/[^\d+]/g, "");
        if (digits) a.setAttribute("href", `tel:${digits}`);
      }
    });

    const footerTel = document.querySelector("#kontaktinfo a[href*='tel']");
    if (footerTel) {
      const h = footerTel.getAttribute("href");
      if (/[A-Za-z]/.test(h)) {
        const txt = (footerTel.textContent || "").replace(/[^\d+]/g, "");
        if (txt) footerTel.setAttribute("href", `tel:${txt}`);
      }
    }

    /* ---------- SIKKERHED FOR FOOTER-CLICK: undgå overlays der blokerer footer ---------- */
    const footer = document.getElementById("kontaktinfo");
    if (footer) {
      const currentZ = window.getComputedStyle(footer).zIndex;
      if (!currentZ || currentZ === "auto" || Number(currentZ) < 20) {
        footer.style.position = "relative";
        footer.style.zIndex = "60";
      }
      footer.style.pointerEvents = "auto";
    }

    if (!printBtn) console.info("Info: #printRecipe findes ikke i DOM.");
    if (!footer) console.info("Info: #kontaktinfo findes ikke i DOM.");
  });
})();

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
