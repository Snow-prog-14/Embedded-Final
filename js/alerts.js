document.addEventListener("DOMContentLoaded", () => {
  const alertsList = document.getElementById("alertsList");
  if (!alertsList) return;

  console.log("alerts.js loaded");

  // Change this if your Pi IP or port changes
  const API_BASE = "http://192.168.1.48:5000";

  loadAlerts();

  async function loadAlerts() {
    try {
      const url = API_BASE + "/api/alerts";
      console.log("Fetching alerts from", url);

      const res = await fetch(url);
      console.log("Fetch /api/alerts status:", res.status);

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const data = await res.json();
      console.log("Alerts response:", data);

      // Expecting: { ok: true, alerts: [...] }
      if (data.ok !== true) {
        throw new Error(data.error || "Unexpected response format");
      }

      const alerts = Array.isArray(data.alerts) ? data.alerts : [];
      alertsList.innerHTML = "";

      if (alerts.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No alerts yet. System is monitoring in the background.";
        alertsList.appendChild(li);
        return;
      }

      alerts.forEach(alert => {
        const li = document.createElement("li");
        li.className = "alert-item";

        const mainRow = document.createElement("div");
        mainRow.className = "alert-main-row";

        const textWrapper = document.createElement("div");
        textWrapper.className = "alert-text";

        const title = document.createElement("div");
        title.className = "alert-title";
        title.textContent = alert.subject || "Alert";

        const meta = document.createElement("div");
        meta.className = "alert-meta";
        const ts = formatTimestamp(alert.ts);
        meta.textContent = `To: ${alert.recipient} • ${ts}`;

        textWrapper.appendChild(title);
        textWrapper.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "alert-actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "btn-download";
        downloadBtn.textContent = "Download";

        downloadBtn.addEventListener("click", () => {
          window.location.href = `${API_BASE}/api/alerts/${alert.id}/download`;
        });

        actions.appendChild(downloadBtn);

        mainRow.appendChild(textWrapper);
        mainRow.appendChild(actions);

        li.appendChild(mainRow);
        alertsList.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading alerts:", err);
      alertsList.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "Failed to load alerts.";
      alertsList.appendChild(li);
    }
  }

  function formatTimestamp(ts) {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  }
});
