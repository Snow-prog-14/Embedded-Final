/*******************************************************
 * LOAD EXISTING SETTINGS INTO FORM
 *******************************************************/
async function loadSettingsIntoForm() {
  const emailInput = document.getElementById("notifEmail");
  const notifToggle = document.getElementById("notifToggle");
  const defaultForecast = document.getElementById("defaultForecast");
  const refreshInput = document.getElementById("refresh");
  const apiInput = document.getElementById("apiUrl");
  const themeSelect = document.getElementById("themeSelect");

  // 1. Determine API root
  const apiRoot = getApiRoot();
  const url = apiRoot + "/settings/latest";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Backend error");

    const data = await res.json();
    if (!data.ok) throw new Error("No settings stored");

    const s = data.settings;

    // 2. Fill in UI fields
    if (emailInput) emailInput.value = s.email || "";
    if (notifToggle) notifToggle.checked = s.notifications ? true : false;
    if (defaultForecast) defaultForecast.value = s.forecast_duration || "";
    if (refreshInput) refreshInput.value = s.refresh_rate || "";

    // 3. Preserve API URL and theme from local storage
    if (apiInput) {
      const api = localStorage.getItem("settingApiUrl");
      if (api) apiInput.value = api;
    }
    if (themeSelect) {
      const theme = localStorage.getItem("settingTheme");
      if (theme) themeSelect.value = theme;
    }

    console.log("Settings loaded from backend");

  } catch (err) {
    console.warn("Could not load settings from backend:", err);
    console.warn("Falling back to local only");

    // Old behavior fallback
    const vEmail = localStorage.getItem("settingEmail");
    if (emailInput && vEmail) emailInput.value = vEmail;

    const vNotif = localStorage.getItem("settingNotifToggle");
    if (notifToggle && vNotif) notifToggle.checked = vNotif === "true";

    const vForecast = localStorage.getItem("settingDefaultForecast");
    if (defaultForecast && vForecast) defaultForecast.value = vForecast;

    const vRefresh = localStorage.getItem("settingRefreshSeconds");
    if (refreshInput && vRefresh) refreshInput.value = vRefresh;

    const vApi = localStorage.getItem("settingApiUrl");
    if (apiInput && vApi) apiInput.value = vApi;

    const vTheme = localStorage.getItem("settingTheme");
    if (themeSelect && vTheme) themeSelect.value = vTheme;
  }
}

/*******************************************************
 * FIND API ROOT (strip /dashboard)
 *******************************************************/
function getApiRoot() {
  const defaultDashboardUrl = "http://192.168.1.48:5000/api/dashboard";
  const storedApi = (localStorage.getItem("settingApiUrl") || "").trim();
  const dashboardUrl = storedApi || defaultDashboardUrl;

  // Example: http://192.168.1.48:5000/api/dashboard → http://192.168.1.48:5000/api
  const m = dashboardUrl.match(/^(.*\/api)(?:\/.*)?$/);
  return m ? m[1] : "http://192.168.1.48:5000/api";
}

/*******************************************************
 * SEND SETTINGS TO BACKEND
 *******************************************************/
async function sendSettingsToBackend(settings) {
  const url = getApiRoot() + "/settings/save";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });

    if (!res.ok) {
      console.error("Failed to save settings on backend:", res.status);
      return;
    }

    console.log("Settings saved on backend");
  } catch (e) {
    console.error("Error sending settings to backend:", e);
  }
}

/*******************************************************
 * SAVE HANDLER (LOCAL + RASPBERRY PI)
 *******************************************************/
function setupSettingsSaveHandler() {
  const saveBtn = document.getElementById("settingsSave");
  if (!saveBtn) return;

  loadSettingsIntoForm();

  saveBtn.addEventListener("click", async () => {
    const emailInput = document.getElementById("notifEmail");
    const notifToggle = document.getElementById("notifToggle");
    const defaultForecast = document.getElementById("defaultForecast");
    const refreshInput = document.getElementById("refresh");
    const apiInput = document.getElementById("apiUrl");
    const themeSelect = document.getElementById("themeSelect");

    const emailVal = emailInput ? emailInput.value.trim() : "";
    const forecastVal = defaultForecast ? defaultForecast.value : "";
    const refreshVal = refreshInput ? refreshInput.value : "";

    // Convert notif toggle → boolean
    let notifEnabled = false;
    if (notifToggle) {
      if (notifToggle.type === "checkbox") {
        notifEnabled = notifToggle.checked;
      } else {
        const t = notifToggle.value.toLowerCase();
        notifEnabled = ["1", "true", "yes", "on"].includes(t);
      }
    }

    // Save to localStorage
    if (emailInput) localStorage.setItem("settingEmail", emailVal);
    if (notifToggle) localStorage.setItem("settingNotifToggle", notifToggle.value);
    if (defaultForecast) localStorage.setItem("settingDefaultForecast", forecastVal);
    if (refreshInput) localStorage.setItem("settingRefreshSeconds", refreshVal);
    if (apiInput) localStorage.setItem("settingApiUrl", apiInput.value.trim());
    if (themeSelect) localStorage.setItem("settingTheme", themeSelect.value);

    // Convert to backend friendly values
    const payload = {
      email: emailVal || null,
      notifications: notifEnabled,
      forecast_duration: parseInt(forecastVal, 10) || null,
      refresh_rate: parseInt(refreshVal, 10) || null
    };

    // Send to Raspberry Pi
    await sendSettingsToBackend(payload);

    alert("Settings saved");
  });
}

/*******************************************************
 * DASHBOARD API SETTINGS
 *******************************************************/
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
