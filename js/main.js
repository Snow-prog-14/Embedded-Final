// Global for forecast chart instance
let forecastChart = null;

// Load header/footer components
function loadComponent(id, url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const el = document.getElementById(id);
      if (!el) return;

      el.innerHTML = data;

      // When header has been injected, apply header behavior
      if (id === "header") {
        handleHeaderBehavior();
      }
    })
    .catch(err => console.error("Error loading " + url + ":", err));
}

// Hide nav on dashboard
function handleHeaderBehavior() {
  const path = window.location.pathname;

  const isDashboard =
    path.endsWith("index.html") ||
    path === "/" ||
    path.endsWith("/monitor") ||
    path.endsWith("/monitor/");

  const nav = document.querySelector(".main-nav");
  if (nav && isDashboard) {
    nav.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Shared header and footer
  loadComponent("header", "components/header.html");
  loadComponent("footer", "components/footer.html");

  // Connection status (used on Live page)
  const status = document.getElementById("connectionStatus");
  if (status) {
    setTimeout(() => {
      status.textContent = "Status: Connected";
    }, 1000);
  }

  // Dashboard: forecast chart setup
  const chartCanvas = document.getElementById("forecastChart");
  if (chartCanvas) {
    initForecastChart(chartCanvas);

    const applyBtn = document.getElementById("applyForecast");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const amountInput = document.getElementById("forecastAmount");
        const unitSelect = document.getElementById("forecastUnit");
        const amount = parseInt(amountInput.value, 10) || 60;
        const unit = unitSelect.value || "minutes";
        updateForecastForDuration(amount, unit);
      });
    }

    // Initial chart for default 60 minutes
    updateForecastForDuration(60, "minutes");
  }
});

// AQI color coding for cards
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

// Status text based on AQI
function updateStatusFromAQI(aqi) {
  const el = document.getElementById("statusText");
  if (!el) return;

  let status = "Unknown";

  if (aqi <= 50) status = "Good";
  else if (aqi <= 100) status = "Moderate";
  else if (aqi <= 150) status = "Unhealthy (Sensitive)";
  else if (aqi <= 200) status = "Unhealthy";
  else if (aqi <= 300) status = "Very Unhealthy";
  else status = "Hazardous";

  el.textContent = status;
}

/* Forecast chart (front end only for now) */

function initForecastChart(canvas) {
  if (!window.Chart) {
    console.warn("Chart.js not loaded");
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

// For now this generates fake data on the front end
// Later you can replace this with a fetch to your forecast API
function updateForecastForDuration(amount, unit) {
  if (!forecastChart) return;

  const points = 12; // number of points in the forecast line
  const labels = [];
  const aqiValues = [];

  // Simple fake curve: start around 40 and wander slightly
  let value = 40;
  const step = Math.max(1, Math.round(amount / points));

  for (let i = 0; i < points; i++) {
    labels.push(step * i + " " + (unit === "hours" ? "h" : "min"));
    value += (Math.random() - 0.5) * 8;
    value = Math.max(0, Math.min(300, value));
    aqiValues.push(Math.round(value));
  }

  forecastChart.data.labels = labels;
  forecastChart.data.datasets[0].data = aqiValues;
  forecastChart.update();

  // Show last value as summary AQI for the period
  const last = aqiValues[aqiValues.length - 1];
  const summary = document.getElementById("aqiSummary");
  if (summary) {
    summary.textContent = last;
  }

  updateStatusFromAQI(last);
}

/* Helpers for live data hookup later */

function updateDashboardFromReading(reading) {
  if (!reading || typeof reading !== "object") return;

  setSpanText("pm25", reading.pm25);
  setSpanText("pm10", reading.pm10);
  setSpanText("co2", reading.co2);
  setSpanText("temp", reading.temperature);
  setSpanText("humidity", reading.humidity);
  setSpanText("aqi", reading.aqi);

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
}

// Example of how you could manually test:
// updateDashboardFromReading({
//   pm25: 12,
//   pm10: 25,
//   co2: 420,
//   temperature: 28,
//   humidity: 65,
//   aqi: 42
// });
