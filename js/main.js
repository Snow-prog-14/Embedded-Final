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

  // Connection status is now controlled by the real backend
  // Hardware dev can update #connectionStatus directly from JS or API
  const status = document.getElementById("connectionStatus");
  if (status) {
    status.textContent = "Status: Waiting for sensor...";
  }

  // Dashboard: forecast chart setup
  const chartCanvas = document.getElementById("forecastChart");
  if (chartCanvas) {
    initForecastChart(chartCanvas);

    const applyBtn = document.getElementById("applyForecast");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const amountInput = document.getElementById("forecastAmount");
        const amount = parseInt(amountInput.value, 10) || 60;

        // TODO hardware dev:
        // fetch forecast data for "amount" minutes from your API,
        // then call setForecastData(labelsArray, aqiArray)
        // For now this just clears the chart
        clearForecastChart();
      });
    }
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

/* Forecast chart setup */

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

/**
 * Hardware dev should call this after getting real forecast data.
 * 
 * @param {string[]} labels - x axis labels, for example ["0 min","10 min","20 min"]
 * @param {number[]} aqiValues - same length as labels
 */
function setForecastData(labels, aqiValues) {
  if (!forecastChart) return;

  forecastChart.data.labels = labels;
  forecastChart.data.datasets[0].data = aqiValues;
  forecastChart.update();

  if (aqiValues.length > 0) {
    const last = aqiValues[aqiValues.length - 1];
    const summary = document.getElementById("aqiSummary");
    if (summary) summary.textContent = last;
    updateStatusFromAQI(last);
  }
}

/**
 * Called when there is no forecast yet or on Apply before data arrives
 */
function clearForecastChart() {
  if (!forecastChart) return;

  forecastChart.data.labels = [];
  forecastChart.data.datasets[0].data = [];
  forecastChart.update();

  const summary = document.getElementById("aqiSummary");
  if (summary) summary.textContent = "--";
}

/* Helpers for live data hookup */

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
