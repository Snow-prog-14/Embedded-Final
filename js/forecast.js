let forecastChart = null;

// Use default forecast duration from settings and show it
function loadForecastDuration() {
  const durationSpan = document.getElementById("forecastAmount");
  if (!durationSpan) return;

  const stored = localStorage.getItem("settingDefaultForecast");
  let duration = stored ? parseInt(stored, 10) : 60;
  if (isNaN(duration) || duration <= 0) duration = 60;

  durationSpan.textContent = duration;

  clearForecastChart();
  // Backend can fetch forecast here and then call setForecastData(...)
}

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

// Called by backend once forecast data is ready
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

function clearForecastChart() {
  if (!forecastChart) return;

  forecastChart.data.labels = [];
  forecastChart.data.datasets[0].data = [];
  forecastChart.update();

  const summary = document.getElementById("aqiSummary");
  if (summary) summary.textContent = "--";
}
