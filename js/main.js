function loadComponent(id, url) {
  fetch(url)
    .then(res => res.text())
    .then(data => document.getElementById(id).innerHTML = data)
    .catch(err => console.error(`Error loading ${url}:`, err));
}

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("header", "components/header.html");
  loadComponent("footer", "components/footer.html");

  const status = document.getElementById("connectionStatus");
  if (status) setTimeout(() => status.textContent = "Connected to Raspberry Pi", 1000);
});

function updateAQI(aqi) {
  const aqiSpan = document.getElementById("aqi-live");
  const aqiCard = aqiSpan.parentElement;

  aqiSpan.textContent = aqi;

  if (aqi <= 50) aqiCard.style.color = "green";
  else if (aqi <= 100) aqiCard.style.color = "yellow";
  else if (aqi <= 150) aqiCard.style.color = "orange";
  else if (aqi <= 200) aqiCard.style.color = "red";
  else if (aqi <= 300) aqiCard.style.color = "purple";
  else aqiCard.style.color = "maroon";
}
