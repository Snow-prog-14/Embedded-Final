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

/* Page entry point */

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("header", "components/header.html");
  loadComponent("footer", "components/footer.html");

  // Settings page: load and wire up save button
  setupSettingsSaveHandler();

  // Connection label initial text (live page)
  const status = document.getElementById("connectionStatus");
  if (status) status.textContent = "Waiting for sensor";

  // Forecast chart on dashboard
  const chartCanvas = document.getElementById("forecastChart");
  if (chartCanvas) {
    initForecastChart(chartCanvas);
  }

  // Show duration from settings on dashboard
  if (document.getElementById("forecastAmount")) {
    loadForecastDuration();
  }

  // Sensor cards present: start auto fetching
  if (document.getElementById("pm25")) {
    document
      .querySelectorAll(".card .value span:first-child")
      .forEach(span => span.classList.add("skeleton"));

    startAutoFetch();
  }
});
