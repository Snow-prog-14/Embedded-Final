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
