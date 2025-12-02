let forecastChart = null;
let apiFailCount = 0;
let autoFetchTimer = null;

/* Load header and footer */
function loadComponent(id, url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = data;

      if (id === "header") handleHeaderBehavior();
    })
    .catch(err => console.error("Error loading " + url + ":", err));
}

/* Hide nav when on dashboard */
function handleHeaderBehavior() {
  const path = window.location.pathname;

  const isDashboard =
    path.endsWith("index.html") ||
    path === "/" ||
    path.endsWith("/monitor") ||
    path.endsWith("/monitor/");

  const nav = document.querySelector(".main-nav");
  if (nav && isDashboard) nav.style.display = "none";
}

/* Settings storage helpers (local only) */
function loadSettingsIntoForm() {
  const emailInput = document.getElementById("notifEmail");
  const notifToggle = document.getElementById("notifToggle");
  const defaultForecast = document.getElementById("defaultForecast");
  const refreshInput = document.getElementById("refresh");
  const apiInput = document.getElementById("apiUrl");
  const themeSelect = document.getElementById("themeSelect");

  if (emailInput) {
    const v = localStorage.getItem("settingEmail");
    if (v) emailInput.value = v;
  }
  if (notifToggle) {
    const v = localStorage.getItem("settingNotifToggle");
    if (v) notifToggle.value = v;
  }
  if (defaultForecast) {
    const v = localStorage.getItem("settingDefaultForecast");
    if (v) defaultForecast.value = v;
  }
  if (refreshInput) {
    const v = localStorage.getItem("settingRefreshSeconds");
    if (v) refreshInput.value = v;
  }
  if (apiInput) {
    const v = localStorage.getItem("settingApiUrl");
    if (v) apiInput.value = v;
  }
  if (themeSelect) {
    const v = localStorage.getItem("settingTheme");
    if (v) themeSelect.value = v;
  }
}

function setupSettingsSaveHandler() {
  const saveBtn = document.getElementById("settingsSave");
  if (!saveBtn) return;

  loadSettingsIntoForm();

  saveBtn.addEventListener("click", () => {
    const emailInput = document.getElementById("notifEmail");
    const notifToggle = document.getElementById("notifToggle");
    const defaultForecast = document.getElementById("defaultForecast");
    const refreshInput = document.getElementById("refresh");
    const apiInput = document.getElementById("apiUrl");
    const themeSelect = document.getElementById("themeSelect");

    if (emailInput) {
      localStorage.setItem("settingEmail", emailInput.value.trim());
    }
    if (notifToggle) {
      localStorage.setItem("settingNotifToggle", notifToggle.value);
    }
    if (defaultForecast) {
      localStorage.setItem("settingDefaultForecast", defaultForecast.value);
    }
    if (refreshInput) {
      localStorage.setItem("settingRefreshSeconds", refreshInput.value);
    }
    if (apiInput) {
      localStorage.setItem("settingApiUrl", apiInput.value.trim());
    }
    if (themeSelect) {
      localStorage.setItem("settingTheme", themeSelect.value);
    }

    alert("Settings saved in this browser");
  });
}

/* API settings: default to http://192.168.1.48:5000/api */
function getSensorSettings() {
  const refreshRaw = localStorage.getItem("settingRefreshSeconds");

  // Default to Pi dashboard endpoint
  const defaultApiUrl = "http://192.168.1.48:5000/api/dashboard";

  const storedApi = (localStorage.getItem("settingApiUrl") || "").trim();
  const url = storedApi || defaultApiUrl;

  let refreshSeconds = parseInt(refreshRaw, 10);
  if (isNaN(refreshSeconds) || refreshSeconds < 2) refreshSeconds = 5;

  console.log("Using API URL:", url, "Refresh:", refreshSeconds, "s");

  return {
    apiUrl: url,
    refreshSeconds
  };
}

/* Sensor update helpers */

function updateDashboardFromReading(reading) {
  if (!reading || typeof reading !== "object") {
    console.warn("updateDashboardFromReading: invalid reading", reading);
    return;
  }

  console.log("Dashboard reading:", reading);

  // Backend JSON:
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
    updateAQI(reading.aqi);        // color + number in AQI card
    updateStatusFromAQI(reading.aqi); // STATUS text (Good / Unhealthy / etc)
    // Do NOT touch aqiSummary here.
    // Predictive AQI will update it via setForecastData().
  }
}
/* Auto API poll with visual feedback */
function startAutoFetch() {
  const status = document.getElementById("connectionStatus");
  const settings = getSensorSettings();
  const intervalMs = settings.refreshSeconds * 1000;

  if (autoFetchTimer) clearInterval(autoFetchTimer);

  if (status) {
    status.classList.remove("status-ok", "status-warn", "status-error", "pulse");
    status.textContent = "Connecting to sensor " +
      "(every " + settings.refreshSeconds + " s)";
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

/* DOM ready */
document.addEventListener("DOMContentLoaded", () => {
  loadComponent("header", "components/header.html");
  loadComponent("footer", "components/footer.html");

  setupSettingsSaveHandler();

  const status = document.getElementById("connectionStatus");
  if (status) status.textContent = "Waiting for sensor";

  const chartCanvas = document.getElementById("forecastChart");
  if (chartCanvas) {
    initForecastChart(chartCanvas);

   
  }

  if (document.getElementById("pm25")) {
    document
      .querySelectorAll(".card .value span:first-child")
      .forEach(span => span.classList.add("skeleton"));

    startAutoFetch();
  }
  if (document.getElementById("forecastAmount")) {
    loadForecastDuration();
}

});

// Load forecast duration from settings automatically
function loadForecastDuration() {
  const amountInput = document.getElementById("forecastAmount");
  if (!amountInput) return;

  const stored = localStorage.getItem("settingDefaultForecast");
  const duration = stored ? parseInt(stored, 10) : 60;




  // Backend should fetch forecast here
  clearForecastChart();
  // fetch(`/api/forecast?minutes=${duration}`) -> then setForecastData(...)
}


/* Sensor update helpers */

function updateDashboardFromReading(reading) {
  if (!reading || typeof reading !== "object") {
    console.warn("updateDashboardFromReading: invalid reading", reading);
    return;
  }

  console.log("Dashboard reading:", reading);

  // Backend JSON:
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

  // Round numbers to 2 decimals for display
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

/* Status from AQI */
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

  // Convert newline into HTML line break
  el.innerHTML = status.replace("\n", "<br>");

  // Remove skeleton when updating
  el.classList.remove("skeleton");
  const wrapper = el.closest(".value");
  if (wrapper) wrapper.classList.remove("skeleton");
}


/* Forecast chart setup */
function initForecastChart(canvas) {
  if (!window.Chart) {
    console.warn("Chart.js missing");
    return;
  }

  const ctx = canvas.getContext("2d");

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "AQI",
          data: [],
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.45)" }
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.45)" }
        }
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" }
        }
      }
    }
  });
}

/* Backend should call this after getting forecast */
function setForecastData(labels, values) {
  if (!forecastChart) return;

  forecastChart.data.labels = labels;
  forecastChart.data.datasets[0].data = values;
  forecastChart.update();

  if (values.length > 0) {
    const last = values[values.length - 1];

    const summary = document.getElementById("aqiSummary");
    if (summary) summary.textContent = last;

    updateStatusFromAQI(last);
  }
}

/* Reset chart */
function clearForecastChart() {
  if (!forecastChart) return;

  forecastChart.data.labels = [];
  forecastChart.data.datasets[0].data = [];
  forecastChart.update();

  const summary = document.getElementById("aqiSummary");
  if (summary) summary.textContent = "--";
}

/* Auto API poll with visual feedback */
function startAutoFetch() {
  const status = document.getElementById("connectionStatus");
  const settings = getSensorSettings();
  const intervalMs = settings.refreshSeconds * 1000;

  if (autoFetchTimer) clearInterval(autoFetchTimer);

  if (status) {
    status.classList.remove("status-ok", "status-warn", "status-error", "pulse");
    status.textContent = "Connecting to sensor " +
      "(every " + settings.refreshSeconds + " s)";
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