// Placeholder: Chart.js logic for live data will go here
console.log("Chart.js loaded");

const ctx = document.getElementById('liveChart').getContext('2d');
const liveChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // timestamps
        datasets: [
            { label: 'PM2.5', data: [], borderColor: '#1f3b70', fill: false },
            { label: 'PM10', data: [], borderColor: '#ff9900', fill: false },
            { label: 'CO2', data: [], borderColor: '#4caf50', fill: false }
        ]
    },
    options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { title: { display: true, text: 'Time' } }, y: { title: { display: true, text: 'Value' } } }
    }
});
