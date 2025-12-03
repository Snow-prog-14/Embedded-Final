// forecast.js – AQI forecast graph + helpers used by main.js
console.log("forecast.js loaded");

// Hard coded Pi API root
const API_ROOT = "http://192.168.1.48:5000/api";

let forecastChart = null;
let forecastTimer = null; // interval id for auto refresh

// Minimum error used visually so the bars are visible
const MIN_VISUAL_ERROR = 0.05;

function formatTime(ts) {
  const d = new Date(ts * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

/*******************************************************
 * ERROR BAR PLUGIN
 * Draws vertical error bars for the scatter dataset
 *******************************************************/
const errorBarPlugin = {
  id: "errorBars",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const scatterIndex = 1; // dataset index for points plus error

    const ds = chart.data.datasets[scatterIndex];
    const meta = chart.getDatasetMeta(scatterIndex);

    if (!ds || !meta || !ds.errorValues) return;

    // IMPORTANT: respect legend toggle
    if (meta.hidden || ds.hidden) return;

    const ctx = chart.ctx;
    const yScale = chart.scales.y;
    const color = pluginOptions.color || "#60a5fa";
    const lineWidth = pluginOptions.lineWidth || 1;
    const capWidth = pluginOptions.capWidth || 6;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    meta.data.forEach((elem, i) => {
      const base = ds.data[i];
      let err = ds.errorValues[i];
      if (base == null || err == null || isNaN(base) || isNaN(err)) return;

      // Ensure minimum visual size
      err = Math.max(err, MIN_VISUAL_ERROR);

      const x = elem.x;
      const yTop = yScale.getPixelForValue(base + err);
      const yBottom = yScale.getPixelForValue(base - err);

      ctx.beginPath();
      // vertical line
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBottom);
      // top cap
      ctx.moveTo(x - capWidth / 2, yTop);
      ctx.lineTo(x + capWidth / 2, yTop);
      // bottom cap
      ctx.moveTo(x - capWidth / 2, yBottom);
      ctx.lineTo(x + capWidth / 2, yBottom);
      ctx.stroke();
    });

    ctx.restore();
  }
};

if (window.Chart) {
  Chart.register(errorBarPlugin);
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
    type: "line", // base type; we mix line + scatter
    data: {
      labels: [],
      datasets: [
        {
          // central forecast line
          label: "AQI Prediction (Line)",
          type: "line",
          data: [],
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          hitRadius: 0
        },
        {
          // points used for error bars
          label: "AQI Prediction (Error Graph)",
          type: "scatter",
          data: [],
          borderWidth: 0,
          pointRadius: 3.5,
          pointHoverRadius: 4.5,
          errorValues: [] // used by plugin
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
        },
        errorBars: {
          color: "#60a5fa",
          lineWidth: 1,
          capWidth: 8
        }
      }
    }
  });
}

/*******************************************************
 * UPDATE CHART DATA
 *******************************************************/
function setForecastData(labels, lineValues, errorValues) {
  if (!forecastChart) return;

  // derive y range from line ± error
  const allValues = [];
  for (let i = 0; i < lineValues.length; i++) {
    const v = lineValues[i];
    if (v == null || isNaN(v)) continue;
    const e = Math.max(errorValues[i] || 0, MIN_VISUAL_ERROR);
    allValues.push(v - e, v + e);
  }
  if (!allValues.length) return;

  let minVal = Math.min(...allValues);
  let maxVal = Math.max(...allValues);

  if (minVal === maxVal) {
    const mid = minVal;
    minVal = mid - 0.05;
    maxVal = mid + 0.05;
  }

  let range = maxVal - minVal;
  if (range < 0.1) {
    const mid = (maxVal + minVal) / 2;
    minVal = mid - 0.05;
    maxVal = mid + 0.05;
    range = maxVal - minVal;
  }

  let padding = range * 0.15;
  if (padding < 0.01) padding = 0.01;

  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  forecastChart.data.labels = labels;

  // line dataset
  forecastChart.data.datasets[0].data = lineValues;

  // scatter dataset for error bars
  forecastChart.data.datasets[1].data = lineValues.slice();
  forecastChart.data.datasets[1].errorValues = errorValues.slice();

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
 * CLEAR CHART
 *******************************************************/
function clearForecastChart() {
  if (!forecastChart) return;

  forecastChart.data.labels = [];
  forecastChart.data.datasets[0].data = [];
  forecastChart.data.datasets[1].data = [];
  forecastChart.data.datasets[1].errorValues = [];
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

    const lineValues = forecast.map(p => p.aqi);

    const errorValues = forecast.map(p => {
      if (typeof p.error === "number") return p.error;
      if (typeof p.margin === "number") return p.margin;
      return 0;
    });

    setForecastData(labels, lineValues, errorValues);

  } catch (err) {
    console.error("Forecast error:", err);
  }
}

/*******************************************************
 * BACKEND REFRESH RATE FOR FORECAST
 *******************************************************/
async function getForecastRefreshSeconds() {
  let refreshSeconds = 1; // minimal fallback

  try {
    const res = await fetch(API_ROOT + "/settings/latest");
    if (res.ok) {
      const json = await res.json();
      console.log("settings/latest for forecast:", json);
      if (json.ok && json.settings) {
        const r = json.settings.refresh_rate;
        if (typeof r === "number" && !isNaN(r) && r >= 1) {
          refreshSeconds = r;
        } else {
          console.warn(
            "Backend refresh_rate missing/invalid for forecast, using 1s"
          );
        }
      }
    } else {
      console.warn("settings/latest for forecast failed, status:", res.status);
    }
  } catch (e) {
    console.warn("Error reading refresh_rate for forecast, using 1s:", e);
  }

  return refreshSeconds;
}

async function startForecastAutoRefresh() {
  if (forecastTimer) {
    clearInterval(forecastTimer);
    forecastTimer = null;
  }

  const refreshSeconds = await getForecastRefreshSeconds();
  const intervalMs = refreshSeconds * 1000;

  console.log("Forecast auto refresh every", refreshSeconds, "seconds");

  // initial load
  await loadAqiForecast();

  // periodic refresh
  forecastTimer = setInterval(loadAqiForecast, intervalMs);
}

/*******************************************************
 * AUTO-LOAD WHEN DASHBOARD READY
 *******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("forecastChart");
  if (!canvas) return;

  initForecastChart(canvas);
  startForecastAutoRefresh();
});
