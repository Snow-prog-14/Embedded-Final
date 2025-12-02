let apiFailCount = 0;
let autoFetchTimer = null;

/* Update dashboard cards from backend JSON */

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

/* AQI color logic */

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

/* Status card text from AQI */

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

/* Auto API polling every N seconds from settings */

function startAutoFetch() {
  const status = document.getElementById("connectionStatus");
  const settings = getSensorSettings();
  const intervalMs = settings.refreshSeconds * 1000;

  if (autoFetchTimer) clearInterval(autoFetchTimer);

  if (status) {
    status.classList.remove("status-ok", "status-warn", "status-error", "pulse");
    status.textContent =
      "Connecting to sensor (every " + settings.refreshSeconds + " s)";
  }

  autoFetchTimer = setInterval(async () => {
    try {
      console.log("Fetching from API:", settings.apiUrl);
      const res = await fetch(settings.apiUrl);
      console.log("Fetch response status:", res.status);

      if (!res.ok) throw new Error("Bad response: " + res.status);

      const data = await res.json();
      console.log("Received JSON:", data);
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
  }, intervalMs);
}
