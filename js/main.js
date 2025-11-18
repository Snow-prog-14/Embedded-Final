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
