// Settings handling (local only)

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

// API settings: default to your Pi dashboard endpoint
function getSensorSettings() {
  const refreshRaw = localStorage.getItem("settingRefreshSeconds");

  const defaultApiUrl = "http://192.168.1.48:5000/api/dashboard";
  const storedApi = (localStorage.getItem("settingApiUrl") || "").trim();
  const url = storedApi || defaultApiUrl;

  let refreshSeconds = parseInt(refreshRaw, 10);
  if (isNaN(refreshSeconds) || refreshSeconds < 2) refreshSeconds = 5;

  console.log("Using API URL:", url, "Refresh:", refreshSeconds, "s");

  return {
    apiUrl: url,
    refreshSeconds
  };
}
