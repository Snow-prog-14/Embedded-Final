function loadComponent(id, url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = data;
      }
    })
    .catch(err => console.error("Error loading " + url + ":", err));
}

document.addEventListener("DOMContentLoaded", () => {
  // Header and footer
  loadComponent("header", "components/header.html");
  loadComponent("footer", "components/footer.html");

  // Connection status (used on live page)
  const status = document.getElementById("connectionStatus");
  if (status) {
    setTimeout(() => {
      status.textContent = "Connected to Raspberry Pi";
    }, 1000);
  }

  // Forecast table (used on dashboard)
  if (document.getElementById("forecastTable")) {
    loadForecast();
  }
});

// AQI color coding for live page
function updateAQI(aqi) {
  const aqiSpan = document.getElementById("aqi-live");
  if (!aqiSpan) return;

  const aqiCard = aqiSpan.parentElement;
  aqiSpan.textContent = aqi;

  if (aqi <= 50) aqiCard.style.color = "green";
  else if (aqi <= 100) aqiCard.style.color = "yellow";
  else if (aqi <= 150) aqiCard.style.color = "orange";
  else if (aqi <= 200) aqiCard.style.color = "red";
  else if (aqi <= 300) aqiCard.style.color = "purple";
  else aqiCard.style.color = "maroon";
}

/* ---------- Forecast helpers for dashboard ---------- */

function loadForecast() {
  const tbody = document.querySelector("#forecastTable tbody");
  if (!tbody) return;

  // Clear any placeholder rows first
  tbody.innerHTML = "";

  // Replace this with your real backend route if different
  fetch("/api/forecast")
    .then(res => {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.json();
    })
    .then(data => {
      renderForecast(data);
    })
    .catch(err => {
      console.error("Error loading forecast:", err);
      renderForecastPlaceholder();
    });
}

function renderForecast(forecastData) {
  const tbody = document.querySelector("#forecastTable tbody");
  if (!tbody) return;

  // If the backend returned something unexpected, keep the UI useful
  if (!Array.isArray(forecastData) || forecastData.length === 0) {
    renderForecastPlaceholder();
    return;
  }

  tbody.innerHTML = "";

  // Expected structure:
  // [
  //   { time: "2025-12-02T13:00:00Z", pm25: 12, pm10: 25, co2: 410, aqi: 35 },
  //   ...
  // ]
  forecastData.forEach(item => {
    const tr = document.createElement("tr");

    const timeCell = document.createElement("td");
    const pm25Cell = document.createElement("td");
    const pm10Cell = document.createElement("td");
    const co2Cell = document.createElement("td");
    const aqiCell = document.createElement("td");

    timeCell.textContent = formatForecastTime(item.time);
    pm25Cell.textContent = item.pm25 != null ? item.pm25 : "--";
    pm10Cell.textContent = item.pm10 != null ? item.pm10 : "--";
    co2Cell.textContent = item.co2 != null ? item.co2 : "--";
    aqiCell.textContent = item.aqi != null ? item.aqi : "--";

    tr.appendChild(timeCell);
    tr.appendChild(pm25Cell);
    tr.appendChild(pm10Cell);
    tr.appendChild(co2Cell);
    tr.appendChild(aqiCell);

    tbody.appendChild(tr);
  });
}

function formatForecastTime(rawTime) {
  if (!rawTime) return "--";

  const date = new Date(rawTime);
  if (isNaN(date.getTime())) {
    // If the backend already sends something like "Next hour"
    return rawTime;
  }

  // Local friendly time, for example "Dec 02, 01:00 PM"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderForecastPlaceholder() {
  const tbody = document.querySelector("#forecastTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const placeholders = [
    "Next hour",
    "In 2 hours",
    "In 3 hours"
  ];

  placeholders.forEach(label => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${label}</td>
      <td>--</td>
      <td>--</td>
      <td>--</td>
      <td>--</td>
    `;

    tbody.appendChild(tr);
  });
}
