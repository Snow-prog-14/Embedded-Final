console.log("history.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const showBtn = document.getElementById("showHistoryBtn");
  const dlBtn = document.getElementById("downloadHistoryBtn");

  if (showBtn) showBtn.addEventListener("click", loadHistory);
  if (dlBtn) dlBtn.addEventListener("click", downloadHistory);
});

function getApiRoot() {
  const api = localStorage.getItem("settingApiUrl") || "";
  const m = api.match(/^(.*\/api)(?:\/.*)?$/);
  return m ? m[1] : "http://192.168.1.48:5000/api";
}

async function loadHistory() {
  const from = document.getElementById("fromDateTime").value;
  const to = document.getElementById("toDateTime").value;

  if (!from || !to) {
    alert("Select both From and To date and time");
    return;
  }

  const start_ts = Math.floor(new Date(from).getTime() / 1000);
  const end_ts = Math.floor(new Date(to).getTime() / 1000);

  const res = await fetch(getApiRoot() + "/history/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: start_ts, end: end_ts })
  });

  const json = await res.json();
  if (!json.ok) {
    alert("Failed: " + json.error);
    return;
  }

  console.log("history query response:", json);

  const rows = json.data.dashboard_readings || [];
  populateHistoryTable(rows);
}

/* Format numbers to fixed decimal places */
function fmtNum(v, decimals = 3) {
  if (v === null || v === undefined || isNaN(v)) return "--";
  return Number(v).toFixed(decimals);
}

function populateHistoryTable(rows) {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;color:#9ca3af">
          No data found
        </td>
      </tr>`;
    return;
  }

  rows.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${formatTs(r.ts)}</td>
        <td>${fmtNum(r.aqi, 3)}</td>
        <td>${fmtNum(r.pm25, 4)}</td>
        <td>${fmtNum(r.pm10, 4)}</td>
        <td>${fmtNum(r.temp, 3)}</td>
        <td>${fmtNum(r.humidity, 3)}</td>
        <td>${fmtNum(r.toxic, 3)}</td>
        <td>${fmtNum(r.flammable, 3)}</td>
        <td>${fmtNum(r.smoke, 3)}</td>
        <td>${fmtNum(r.voc, 3)}</td>
      </tr>`;
  });
}

function formatTs(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

function downloadHistory() {
  const fmt = prompt("Download format: csv or xlsx?", "csv");
  if (!fmt) return;

  const url = getApiRoot() + "/history/download?fmt=" + fmt.toLowerCase();
  window.open(url, "_blank");   // opens download in a new tab
}
