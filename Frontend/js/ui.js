import { SERVICE_COLORS, SERVICE_ICONS } from './constants.js';

function renderServiceCard(service, callback) {
  const colors = SERVICE_COLORS[service.id] || SERVICE_COLORS.default;
  const icon = SERVICE_ICONS[service.id] || '📋';

  return `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
      <div class="h-2 bg-gradient-to-r ${colors}"></div>
      <div class="p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800">${icon} ${service.name}</h3>
            <p class="text-sm text-gray-600">${service.description || 'No description'}</p>
          </div>
          <span class="text-3xl opacity-20">${icon}</span>
        </div>
        
        <div class="space-y-2 mb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Service Booths:</span>
            <span class="font-semibold text-gray-800">${service.booths}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Avg Service Time:</span>
            <span class="font-semibold text-gray-800">${Math.round(service.avg_service_time / 60)} min</span>
          </div>
        </div>

        <button 
          onclick="${callback}" 
          class="w-full bg-gradient-to-r ${colors} text-white py-2 rounded-lg font-semibold hover:shadow-lg transition"
        >
          Join Queue
        </button>
      </div>
    </div>
  `;
}

function renderQueuePosition(entry, queueStatus) {
  const estimatedWait = Math.round(queueStatus.avgWaitTime / 60);
  const position = entry.position;

  return `
    <div class="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div class="text-center">
        <p class="text-gray-600 text-sm mb-2">Your Position</p>
        <div class="text-6xl font-bold text-blue-600 mb-2">#${position}</div>
        <p class="text-gray-700 font-semibold">${queueStatus.service.name}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-blue-50 rounded-lg p-4 text-center">
          <p class="text-gray-600 text-sm mb-1">Queue Length</p>
          <p class="text-2xl font-bold text-blue-600">${queueStatus.queueLength}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center">
          <p class="text-gray-600 text-sm mb-1">Est. Wait</p>
          <p class="text-2xl font-bold text-green-600">${estimatedWait} min</p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">Status:</span>
          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
            ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">Joined:</span>
          <span class="text-gray-800 font-mono">${new Date(entry.joined_at).toLocaleTimeString()}</span>
        </div>
      </div>

      <button 
        onclick="app.leaveQueue()" 
        class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
      >
        Leave Queue
      </button>
    </div>
  `;
}

function renderStats(queues) {
  const statsHTML = Object.entries(queues).map(([serviceId, status]) => {
    const colors = SERVICE_COLORS[serviceId] || SERVICE_COLORS.default;
    const icon = SERVICE_ICONS[serviceId] || '📋';

    return `
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800">${icon} ${status.service.name}</h3>
          <span class="text-3xl opacity-20">${icon}</span>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">In Queue:</span>
            <span class="text-2xl font-bold text-blue-600">${status.queueLength}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Avg Wait:</span>
            <span class="font-semibold text-gray-800">${Math.round(status.avgWaitTime / 60)} min</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return statsHTML;
}

function showNotification(message, type = 'info') {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  const notification = document.createElement('div');
  notification.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 animate-bounce z-50`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

export { renderServiceCard, renderQueuePosition, renderStats, showNotification };