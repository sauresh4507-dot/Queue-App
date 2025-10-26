const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

let socket = null;
let chartsInitialized = false;
let currentService = null;

function initWebSocket() {
  socket = io(SOCKET_URL);

  socket.on('connect', () => {
    console.log('✓ Admin connected to WebSocket');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', () => {
    console.log('✗ Admin disconnected');
    updateConnectionStatus(false);
  });

  socket.on('queue-updated', (data) => {
    console.log('📡 Queue updated:', data);
    refreshDashboard();
    if (currentService) {
      refreshManagement(currentService);
    }
  });
}

function updateConnectionStatus(connected) {
  const status = document.getElementById('connectionStatus');
  if (status) {
    if (connected) {
      status.innerHTML = `
        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
        <span class="text-xs text-gray-600">Connected</span>
      `;
    } else {
      status.innerHTML = `
        <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span class="text-xs text-gray-600">Disconnected</span>
      `;
    }
  }
}

function switchTab(tabName) {
  // Hide all tabs
  document.getElementById('dashboard-tab').classList.add('hidden');
  document.getElementById('analytics-tab').classList.add('hidden');
  document.getElementById('management-tab').classList.add('hidden');

  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');

  // Update button styles
  document.querySelectorAll('button[onclick*="switchTab"]').forEach(btn => {
    btn.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
    btn.classList.add('text-gray-600');
  });
  event.target.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');

  if (tabName === 'analytics' && !chartsInitialized) {
    setTimeout(() => initCharts(), 100);
  }
}

async function refreshDashboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/queue`);
    const data = await response.json();

    const html = Object.entries(data.data || {}).map(([serviceId, status]) => `
      <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
        <h3 class="text-lg font-bold text-gray-800 mb-4">${status.service?.name || 'Unknown'}</h3>
        
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center bg-blue-50 p-4 rounded">
            <p class="text-gray-600 text-sm">In Queue</p>
            <p class="text-3xl font-bold text-blue-600">${status.queueLength || 0}</p>
          </div>
          <div class="text-center bg-green-50 p-4 rounded">
            <p class="text-gray-600 text-sm">Avg Wait</p>
            <p class="text-3xl font-bold text-green-600">${Math.round((status.avgWaitTime || 0) / 60)}</p>
            <p class="text-xs text-gray-600">min</p>
          </div>
          <div class="text-center bg-purple-50 p-4 rounded">
            <p class="text-gray-600 text-sm">Booths</p>
            <p class="text-3xl font-bold text-purple-600">${status.service?.booths || 1}</p>
          </div>
        </div>

        <div class="space-y-2">
          <button onclick="serveNext('${serviceId}')" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold transition">
            ✓ Serve Next Customer
          </button>
          <button onclick="showManagement('${serviceId}')" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold transition">
            👀 View Details
          </button>
          <button onclick="clearServed('${serviceId}')" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded font-semibold transition">
            🗑️ Clear Completed
          </button>
        </div>
      </div>
    `).join('');

    document.getElementById('dashboardGrid').innerHTML = html;
  } catch (err) {
    console.error('Error refreshing dashboard:', err);
  }
}

async function serveNext(serviceId) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/serve-next/${serviceId}`, {
      method: 'POST'
    });
    const result = await response.json();
    
    if (result.success) {
      showNotification(`✓ Served customer!`, 'success');
      await refreshDashboard();
    }
  } catch (err) {
    console.error('Error serving next:', err);
    showNotification('Failed to serve customer', 'error');
  }
}

async function clearServed(serviceId) {
  if (!confirm('Clear all completed customers from this queue?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/clear-served/${serviceId}`, {
      method: 'POST'
    });
    const result = await response.json();
    
    if (result.success) {
      showNotification(`✓ Cleared ${result.cleared} completed entries`, 'success');
      await refreshDashboard();
    }
  } catch (err) {
    console.error('Error clearing served:', err);
    showNotification('Failed to clear queue', 'error');
  }
}

async function showManagement(serviceId) {
  currentService = serviceId;
  document.querySelector('button[onclick="switchTab(\'management\')"]').click();
  await refreshManagement(serviceId);
}

async function refreshManagement(serviceId) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/queue-details/${serviceId}`);
    const result = await response.json();
    const { waiting, served } = result.data;

    let html = `
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)} Queue</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded text-center">
            <p class="text-gray-600 text-sm">Waiting</p>
            <p class="text-3xl font-bold text-blue-600">${waiting.length}</p>
          </div>
          <div class="bg-green-50 p-4 rounded text-center">
            <p class="text-gray-600 text-sm">Served Today</p>
            <p class="text-3xl font-bold text-green-600">${served.length}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <h4 class="font-bold text-gray-800 mb-2">⏳ Waiting (${waiting.length})</h4>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${waiting.length > 0 ? waiting.map((entry, idx) => `
                <div class="bg-gray-50 p-3 rounded flex justify-between items-center">
                  <div>
                    <p class="font-bold text-lg">#${entry.position}</p>
                    <p class="text-xs text-gray-600">${entry.user_id.substr(0, 12)}...</p>
                  </div>
                  <p class="text-xs text-gray-600">${new Date(entry.joined_at).toLocaleTimeString()}</p>
                </div>
              `).join('') : '<p class="text-gray-500">No one waiting</p>'}
            </div>
          </div>

          <div>
            <h4 class="font-bold text-gray-800 mb-2">✓ Served (${served.length})</h4>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${served.length > 0 ? served.slice(0, 10).map(entry => `
                <div class="bg-green-50 p-3 rounded flex justify-between items-center">
                  <p class="text-xs text-gray-600">${entry.user_id.substr(0, 12)}...</p>
                  <p class="text-xs text-green-600">${new Date(entry.served_at).toLocaleTimeString()}</p>
                </div>
              `).join('') : '<p class="text-gray-500">No one served yet</p>'}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('managementGrid').innerHTML = html;
  } catch (err) {
    console.error('Error refreshing management:', err);
  }
}

async function getAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`);
    const data = await response.json();
    return data.data || {};
  } catch (err) {
    console.error('Error getting analytics:', err);
    return {};
  }
}

async function initCharts() {
  const analytics = await getAnalytics();

  // Wait Time Chart
  const waitTimeCtx = document.getElementById('waitTimeChart');
  if (waitTimeCtx) {
    const labels = Object.keys(analytics);
    const waitTimes = labels.map(id => analytics[id]?.avgWaitTime || 0);

    new Chart(waitTimeCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Wait Time (min)',
          data: waitTimes.map(t => Math.round(t / 60)),
          backgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Average Wait Time by Service' } }
      }
    });
  }

  // Queue Length Chart
  const queueCtx = document.getElementById('queueLengthChart');
  if (queueCtx) {
    const labels = Object.keys(analytics);
    const peakQueues = labels.map(id => analytics[id]?.peakQueueLength || 0);

    new Chart(queueCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peak Queue Length',
          data: peakQueues,
          borderColor: '#3b82f6',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Peak Queue Length by Service' } }
      }
    });
  }

  chartsInitialized = true;
}

function showNotification(message, type = 'info') {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  const notification = document.createElement('div');
  notification.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 z-50 animate-bounce`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  refreshDashboard();
  
  // Auto-refresh dashboard every 3 seconds
  setInterval(refreshDashboard, 3000);
});