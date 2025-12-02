// forecast.js – AQI forecast graph + helpers used by main.js
console.log("forecast.js loaded");

// Hard coded Pi API root
const API_ROOT = "http://192.168.1.48:5000/api";

let forecastChart = null;

function formatTime(ts) {
  const d = new Date(ts * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

/*******************************************************
 * INITIAL CHART (called from main.js)
 *******************************************************/
function initForecastChart(canvas) {
  if (!window.Chart || !canvas) {
    console.warn("Chart.js or canvas missing");
    return;
  }

  // If a chart already exists on this canvas, do nothing
  if (window.Chart.getChart && window.Chart.getChart(canvas)) {
    return;
  }

  const ctx = canvas.getContext("2d");

  forecastChart = new Chart(ctx, {
    type: "line",        // base type; we will mix scatter+line datasets
    data: {
      labels: [],
      datasets: [
        {
          // predictive AQI as scatter
          label: "Predicted AQI (scatter)",
          type: "scatter",
          data: [],
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 4
        },
        {
          // predictive AQI as line
          label: "Predicted AQI (line)",
          type: "line",
          data: [],
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          hitRadius: 0
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
          grid: { color: "rgba(55,65,81,0.45)" },
          title: { display: true, text: "AQI" }
          // min/max set dynamically in setForecastData
        }
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const v = ctx.parsed.y;
              return "AQI: " + (v != null ? v.toFixed(3) : "--");
            }
          }
        }
      }
    }
  });
}

/*******************************************************
 * UPDATE CHART DATA (used both by loader and Apply logic)
 *******************************************************/
function setForecastData(labels, lineValues, scatterValues) {
  if (!forecastChart) return;

  // Combine both sets to get min and max for axis
  const allValues = [...lineValues, ...scatterValues].filter(v => v != null);

  if (!allValues.length) return;

  let minVal = Math.min(...allValues);
  let maxVal = Math.max(...allValues);

  if (minVal === maxVal) {
    minVal -= 0.5;
    maxVal += 0.5;
  }

  let padding = (maxVal - minVal) * 0.15;
  if (padding < 0.05) padding = 0.05;

  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  forecastChart.data.labels = labels;

  // scatter dataset (with margin of error applied)
  forecastChart.data.datasets[0].data = scatterValues;

  // line dataset (true forecast values)
  forecastChart.data.datasets[1].data = lineValues;

  forecastChart.options.scales.y.min = yMin;
  forecastChart.options.scales.y.max = yMax;

  forecastChart.update();

  if (lineValues.length > 0) {
    const lastAqi = lineValues[lineValues.length - 1];
    const summary = document.getElementById("aqiSummary");
    if (summary) summary.textContent = lastAqi.toFixed(1);
  }
}

/*******************************************************
 * CLEAR CHART (used when Apply clicked in main.js)
 *******************************************************/
function clearForecastChart() {
  if (!forecastChart) return;

  forecastChart.data.labels = [];
  forecastChart.data.datasets[0].data = [];
  forecastChart.data.datasets[1].data = [];
  forecastChart.update();

  const summary = document.getElementById("aqiSummary");
  if (summary) summary.textContent = "--";
}

/*******************************************************
 * LOAD PREDICTIVE DATA FROM /api/aqi/forecast
 *******************************************************/
async function loadAqiForecast() {
  try {
    const res = await fetch(API_ROOT + "/aqi/forecast");
    if (!res.ok) throw new Error("Bad response: " + res.status);

    const data = await res.json();
    console.log("Forecast JSON:", data);

    if (!data.ok) {
      console.warn("Forecast not ready:", data.reason);
      return;
    }

    const forecast = data.forecast || [];
    if (!forecast.length) {
      console.warn("No forecast points returned");
      return;
    }

    const labels = forecast.map(p => formatTime(p.ts));

    // Base AQI values for the line
    const lineValues = forecast.map(p => p.aqi);

    // Scatter values with margin of error
    // Expected backend fields:
    //   p.error or p.margin  numeric value representing +/- AQI
    const scatterValues = forecast.map(p => {
      const base = p.aqi;
      const margin =
        typeof p.error === "number"
          ? p.error
          : typeof p.margin === "number"
          ? p.margin
          : 0;

      // No margin  scatter dot on the line
      if (!margin) return base;

      // Randomly scatter up or down by the margin
      const sign = Math.random() < 0.5 ? -1 : 1;
      return base + sign * margin;
    });

    setForecastData(labels, lineValues, scatterValues);

  } catch (err) {
    console.error("Forecast error:", err);
  }
}

/*******************************************************
 * AUTO-LOAD WHEN DASHBOARD READY
 *******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("forecastChart");
  if (!canvas) return;

  // Ensure chart exists, then fetch forecast
  initForecastChart(canvas);
  loadAqiForecast();
});
