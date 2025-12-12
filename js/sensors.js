let apiFailCount = 0;
let autoFetchTimer = null;

/* ---------------- Dashboard card updates ---------------- */

function updateDashboardFromReading(reading) {
  if (!reading || typeof reading !== "object") {
    console.warn("updateDashboardFromReading: invalid reading", reading);
    return;
  }

  console.log("Dashboard reading:", reading);

  // Backend JSON fields:
  // aqi, flame, humidity, pm10, pm25, smoke, temperature, toxic, ts, voc
  setSpanText("pm25", reading.pm25);
  setSpanText("pm10", reading.pm10);
  setSpanText("temp", reading.temperature);
  setSpanText("humidity", reading.humidity);

  setSpanText("aqi", reading.aqi);
  setSpanText("toxic", reading.toxic);
  setSpanText("flame", reading.flame);
  setSpanText("smoke", reading.smoke);
  setSpanText("voc", reading.voc);

  if (reading.aqi != null) {
    updateAQI(reading.aqi);

    const summary = document.getElementById("aqiSummary");
    if (summary) summary.textContent = reading.aqi;

    updateStatusFromAQI(reading.aqi);
  }
}

function setSpanText(id, value) {
  const span = document.getElementById(id);
  if (!span) return;

  if (value == null || value === "") {
    span.textContent = "--";
    return;
  }

  if (typeof value === "number") {
    value = Number(value.toFixed(2));
  }

  span.textContent = value;
  highlightUpdate(id);
}

function highlightUpdate(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove("skeleton");

  const wrapper = el.closest(".value") || el.parentElement;
  if (!wrapper) return;

  wrapper.classList.add("value-updated");
  setTimeout(() => wrapper.classList.remove("value-updated"), 350);
}

/* ---------------- AQI visual helpers ---------------- */

function updateAQI(aqi) {
  const aqiSpan =
    document.getElementById("aqi-live") || document.getElementById("aqi");
  if (!aqiSpan) return;

  const card = aqiSpan.closest(".card") || aqiSpan.parentElement;

  const displayAqi = typeof aqi === "number" ? aqi.toFixed(2) : aqi;
  aqiSpan.textContent = displayAqi;

  if (!card) return;

  if (aqi <= 50) card.style.color = "lightgreen";
  else if (aqi <= 100) card.style.color = "yellow";
  else if (aqi <= 150) card.style.color = "orange";
  else if (aqi <= 200) card.style.color = "red";
  else if (aqi <= 300) card.style.color = "violet";
  else card.style.color = "maroon";
}

function updateStatusFromAQI(aqi) {
  const el = document.getElementById("statusText");
  if (!el) return;

  let status = "Unknown";

  if (aqi <= 50) status = "Good";
  else if (aqi <= 100) status = "Moderate";
  else if (aqi <= 150) status = "Unhealthy\nSensitive";
  else if (aqi <= 200) status = "Unhealthy";
  else if (aqi <= 300) status = "Very\nUnhealthy";
  else status = "Hazardous";

  el.innerHTML = status.replace("\n", "<br>");

  el.classList.remove("skeleton");
  const wrapper = el.closest(".value");
  if (wrapper) wrapper.classList.remove("skeleton");
}

/* ---------------- API root helpers (mirrors forecast.js style) ---------------- */

// Use the same API base as forecast.js. If settings.js defined getApiRoot(),
// we use that so API URL overrides keep working.
function getApiRootForSensors() {
  if (typeof getApiRoot === "function") {
    return getApiRoot();
  }
  // fallback if getApiRoot is not available for some reason
  return "http://192.168.1.48:5000/api";
}

function getDashboardUrl() {
  return getApiRootForSensors() + "/dashboard";
}

async function getDashboardRefreshSeconds() {
  const apiRoot = getApiRootForSensors();
  let refreshSeconds = 1; // minimal fallback

  try {
    const res = await fetch(apiRoot + "/settings/latest");
    if (!res.ok) {
      console.warn("settings/latest for dashboard status:", res.status);
    } else {
      const json = await res.json();
      console.log("settings/latest for dashboard:", json);
      if (json.ok && json.settings) {
        const r = json.settings.refresh_rate;
        if (typeof r === "number" && !isNaN(r) && r >= 1) {
          refreshSeconds = r;
        } else {
          console.warn("refresh_rate missing/invalid for dashboard, using 1s");
        }
      }
    }
  } catch (e) {
    console.warn("Error fetching refresh_rate for dashboard, using 1s:", e);
  }

  return refreshSeconds;
}

/* ---------------- Auto fetch loop (same pattern as forecast.js) ---------------- */

async function startAutoFetch() {
  const status = document.getElementById("connectionStatus");
  const dashboardUrl = getDashboardUrl();
  const refreshSeconds = await getDashboardRefreshSeconds();
  const intervalMs = refreshSeconds * 1000;

  console.log(
    "Dashboard auto fetch from",
    dashboardUrl,
    "every",
    refreshSeconds,
    "seconds"
  );

  if (autoFetchTimer) {
    clearInterval(autoFetchTimer);
    autoFetchTimer = null;
  }

  if (status) {
    status.classList.remove("status-ok", "status-warn", "status-error", "pulse");
    status.textContent =
      "Connecting to sensor (every " + refreshSeconds + " s)";
  }

  const fetchOnce = async () => {
    try {
      console.log("Fetching dashboard:", dashboardUrl);
      const res = await fetch(dashboardUrl);
      console.log("Dashboard response status:", res.status);

      if (!res.ok) throw new Error("Bad response: " + res.status);

      const data = await res.json();
      console.log("Dashboard JSON:", data);
      updateDashboardFromReading(data);

      apiFailCount = 0;
      if (status) {
        status.classList.remove("status-warn", "status-error", "pulse");
        status.classList.add("status-ok");
        status.textContent = "Connected";
      }
    } catch (err) {
      console.error("API fetch error:", err);
      apiFailCount++;

      if (!status) return;

      if (apiFailCount >= 3) {
        status.classList.remove("status-ok", "status-warn");
        status.classList.add("status-error", "pulse");
        status.textContent = "No connection";
      } else {
        status.classList.remove("status-ok", "status-error");
        status.classList.add("status-warn", "pulse");
        status.textContent = "Reconnecting";
      }
    }
  };

  // First reading immediately (same idea as forecast auto refresh)
  await fetchOnce();

  // Then repeat by backend controlled interval
  autoFetchTimer = setInterval(fetchOnce, intervalMs);
}

// ---------- Sensor tooltips and level coloring ----------
// Append this to the end of js/sensors.js or a new js/tooltips.js
// Make sure it runs after the DOM and after your code that updates the numeric values.

document.addEventListener('DOMContentLoaded', () => {
  // Define tooltip text and evaluation rules per sensor id/label.
  // Keys should match either the id of the value span (e.g. "pm25") or the label text on the card.
  const SENSOR_CONFIG = {
    pm25: {
      tooltip: 'Good: 0–12 | Moderate: 12.1–35.4 | Bad: 35.5+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 12) return 'good';
        if (v <= 35.4) return 'moderate';
        return 'bad';
      }
    },
    pm10: {
      tooltip: 'Good: 0–54 | Moderate: 55–154 | Bad: 155+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 54) return 'good';
        if (v <= 154) return 'moderate';
        return 'bad';
      }
    },
    aqi: {
      tooltip: 'Good: 0–50 | Moderate: 51–100 | Bad: 101+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 50) return 'good';
        if (v <= 100) return 'moderate';
        return 'bad';
      }
    },
    temp: {
      tooltip: 'Good: 18–26°C | Moderate: 10–17.9°C and 26.1–32°C | Bad: <10°C or >32°C',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v >= 18 && v <= 26) return 'good';
        if ((v >= 10 && v < 18) || (v > 26 && v <= 32)) return 'moderate';
        return 'bad';
      }
    },
    humidity: {
      tooltip: 'Good: 30–50% | Moderate: 20–29% and 51–60% | Bad: <20% or >60%',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v >= 30 && v <= 50) return 'good';
        if ((v >= 20 && v < 30) || (v > 50 && v <= 60)) return 'moderate';
        return 'bad';
      }
    },
    toxic: {
      tooltip: 'Good: 0–50 | Moderate: 51–100 | Bad: 101+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 50) return 'good';
        if (v <= 100) return 'moderate';
        return 'bad';
      }
    },
    flame: {
      tooltip: 'Good: No flame | Moderate: Unstable | Bad: Flame detected',
      evaluate(value) {
        // flame often shows as 0/1 or numeric analog. Treat "1", "true" or > threshold as detected.
        const raw = String(value).trim().toLowerCase();
        if (raw === '' || raw === '--') return 'unknown';
        if (raw === '0' || raw === 'false' || raw === 'no' ) return 'good';
        if (raw === '1' || raw === 'true' || raw === 'yes') return 'bad';
        // if numeric analog, treat > 100 as flame
        const v = parseFloat(value);
        if (!Number.isNaN(v)) {
          if (v <= 50) return 'good';
          if (v <= 200) return 'moderate';
          return 'bad';
        }
        return 'unknown';
      }
    },
    smoke: {
      tooltip: 'Good: 0–50 | Moderate: 51–100 | Bad: 101+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 50) return 'good';
        if (v <= 100) return 'moderate';
        return 'bad';
      }
    },
    voc: {
      tooltip: 'Good: 0–220 | Moderate: 221–660 | Bad: 661+',
      evaluate(value) {
        const v = parseFloat(value);
        if (Number.isNaN(v)) return 'unknown';
        if (v <= 220) return 'good';
        if (v <= 660) return 'moderate';
        return 'bad';
      }
    },
    statusText: { // fallback mapping for Status card which uses id "statusText" in index.html
      tooltip: 'Status indicator. Hover the other sensors for numeric ranges.',
      evaluate() { return 'unknown'; }
    }
  };

  // Helper: normalize label text to a key used above.
  function labelToKey(label) {
    return label
      .toLowerCase()
      .replace(/[^\w]+/g, '') // remove spaces/punctuation
      .replace('pm2.5','pm25')
      .replace('pm25','pm25')
      .replace('pm10','pm10')
      .replace('airqualityindex','aqi')
      .replace('temperature','temp')
      .replace('humidity','humidity')
      .replace('toxic','toxic')
      .replace('flame','flame')
      .replace('smoke','smoke')
      .replace('voc','voc')
      .replace('status','statusText');
  }

  // Find all cards and attach tooltip text and initial level class
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    // Determine a key from either child span.label text or from value span id
    let key = null;

    // prefer value id if present
    const valueSpan = card.querySelector('.value span[id]');
    if (valueSpan && valueSpan.id) {
      key = valueSpan.id;
    } else {
      const labelEl = card.querySelector('.label');
      if (labelEl) key = labelToKey(labelEl.textContent || labelEl.innerText || '');
    }

    // fallback: try label text cleaned
    if (!key) {
      const labelText = (card.textContent || '').slice(0, 20);
      key = labelToKey(labelText);
    }

    const cfg = SENSOR_CONFIG[key];

    // Attach tooltip text
    if (cfg && cfg.tooltip) {
      card.setAttribute('data-tooltip', cfg.tooltip);
    } else {
      // default tooltip if we don't know the sensor
      card.setAttribute('data-tooltip', 'Ranges not configured for this sensor');
    }

    // Evaluate and style right now
    function evaluateAndStyle() {
      // try to read the inner numeric value from a child span with an id or numeric text
      let rawVal = '--';
      if (valueSpan && valueSpan.textContent) {
        rawVal = valueSpan.textContent.trim();
      } else {
        // fallback: look for a child .value and take first number-like token
        const valEl = card.querySelector('.value');
        if (valEl && valEl.textContent) rawVal = valEl.textContent.trim();
      }

      // remove unit symbols from the raw value for numeric parsing
      const cleaned = rawVal.replace(/[^\d.\-+eE]/g, '').trim();

      let level = 'unknown';
      if (cfg && typeof cfg.evaluate === 'function') {
        // pass numeric-like or raw text
        level = cfg.evaluate(cleaned === '' ? rawVal : cleaned) || 'unknown';
      }

      // remove any prior level classes then add current
      card.classList.remove('level-good', 'level-moderate', 'level-bad', 'level-unknown');
      card.classList.add('level-' + level);
    }

    // run once now
    evaluateAndStyle();

    // If sensor values update live, observe changes and re-evaluate
    // Use a MutationObserver on the value span to detect updates
    if (valueSpan) {
      const mo = new MutationObserver(() => evaluateAndStyle());
      mo.observe(valueSpan, { childList: true, subtree: true, characterData: true });
    } else {
      // if no id value span but values might update in the .value element, watch it
      const valEl = card.querySelector('.value');
      if (valEl) {
        const mo2 = new MutationObserver(() => evaluateAndStyle());
        mo2.observe(valEl, { childList: true, subtree: true, characterData: true });
      }
    }
  });
});

