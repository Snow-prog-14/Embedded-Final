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

function getSensorSettings() {
  const refreshRaw = localStorage.getItem("settingRefreshSeconds");
  const url = localStorage.getItem("settingApiUrl") || "/api/sensor/latest";

  let refreshSeconds = parseInt(refreshRaw, 10);
  if (isNaN(refreshSeconds) || refreshSeconds < 2) refreshSeconds = 5;

  return {
    apiUrl: url,
    refreshSeconds
  };
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

    const applyBtn = document.getElementById("applyForecast");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const amountInput = document.getElementById("forecastAmount");
        const amount = parseInt(amountInput.value, 10) || 60;
        clearForecastChart();
        // Backend should get forecast for amount minutes then call setForecastData
      });
    }
  }

  if (document.getElementById("pm25")) {
    document
      .querySelectorAll(".card .value span:first-child")
      .forEach(span => span.classList.add("skeleton"));

    startAutoFetch();
  }
});

/* Sensor update helpers */

function updateDashboardFromReading(reading) {
  if (!reading || typeof reading !== "object") return;

  setSpanText("pm25", reading.pm25);
  setSpanText("pm10", reading.pm10);
  setSpanText("co2", reading.co2);
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
  } else {
    span.textContent = value;
  }

  if (value != null && value !== "") {
    highlightUpdate(id);
  }
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
  aqiSpan.textContent = aqi;
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
  else if (aqi <= 150) status = "Unhealthy Sensitive";
  else if (aqi <= 200) status = "Unhealthy";
  else if (aqi <= 300) status = "Very Unhealthy";
  else status = "Hazardous";

  el.textContent = status;
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
      const res = await fetch(settings.apiUrl);
      if (!res.ok) throw new Error("Bad response");

      const data = await res.json();
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
