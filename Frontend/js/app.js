const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';
const STORAGE_KEY = 'queueup_user';

const SERVICE_COLORS = {
  canteen: 'from-orange-500 to-red-500',
  counseling: 'from-green-500 to-emerald-500',
  default: 'from-blue-500 to-indigo-500'
};

const SERVICE_ICONS = {
  canteen: '🍽️',
  counseling: '💬'
};

// WebSocket connection
let socket = null;

function initWebSocket() {
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✓ Connected to WebSocket');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', () => {
    console.log('✗ Disconnected from WebSocket');
    updateConnectionStatus(false);
  });

  socket.on('queue-updated', (data) => {
    console.log('📡 Queue updated:', data);
    if (app) app.handleQueueUpdate(data);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket error:', error);
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

// API CALLS
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return await response.json();
}

async function getServices() {
  return apiRequest('/services');
}

async function getAllQueues() {
  try {
    const response = await fetch(`${API_BASE_URL}/queue`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error getting all queues:', error);
    return { data: {} };
  }
}

async function joinQueueAPI(serviceId, userId) {
  return apiRequest('/queue/join', {
    method: 'POST',
    body: JSON.stringify({ serviceId, userId })
  });
}

async function getQueuePosition(entryId) {
  return apiRequest(`/queue/${entryId}`);
}

async function leaveQueueAPI(entryId) {
  return apiRequest(`/queue/${entryId}`, { method: 'DELETE' });
}

// UI FUNCTIONS
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

function renderServiceCard(service) {
  const colors = SERVICE_COLORS[service.id] || SERVICE_COLORS.default;
  const icon = SERVICE_ICONS[service.id] || '📋';

  return `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
      <div class="h-2 bg-gradient-to-r ${colors}"></div>
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-2">${icon} ${service.name}</h3>
        <p class="text-sm text-gray-600 mb-4">${service.description || 'No description'}</p>
        <div class="space-y-2 mb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Booths:</span>
            <span class="font-semibold">${service.booths}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Avg Time:</span>
            <span class="font-semibold">${Math.round(service.avg_service_time / 60)} min</span>
          </div>
        </div>
        <button onclick="app.joinQueue('${service.id}')" class="w-full bg-gradient-to-r ${colors} text-white py-2 rounded-lg font-semibold hover:shadow-lg transition">
          Join Queue
        </button>
      </div>
    </div>
  `;
}

// MAIN APP CLASS
class QueueUpApp {
  constructor() {
    this.userId = this.getUserId();
    this.currentEntry = null;
    this.services = [];
    this.currentService = null;
    this.queuesData = {};
  }

  getUserId() {
    let userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
  }

  async init() {
    try {
      console.log('🚀 Initializing QueueUp with WebSocket...');
      document.getElementById('userIdDisplay').textContent = `ID: ${this.userId.substr(0, 12)}...`;
      
      // Initialize WebSocket
      initWebSocket();
      
      await this.loadServices();
      await this.refreshQueues();
      
      console.log('✓ App initialized with real-time WebSocket');
    } catch (error) {
      console.error('Initialization error:', error);
      showNotification('Failed to initialize app', 'error');
    }
  }

  async loadServices() {
    try {
      const response = await getServices();
      this.services = response.data;
      this.renderServices();
    } catch (error) {
      console.error('Error loading services:', error);
      showNotification('Failed to load services', 'error');
    }
  }

  renderServices() {
    const container = document.getElementById('servicesList');
    const html = this.services.map(service => 
      `<div>${renderServiceCard(service)}</div>`
    ).join('');
    container.innerHTML = html;
  }

  async joinQueue(serviceId) {
    if (this.currentEntry) {
      showNotification('Already in a queue. Leave first.', 'error');
      return;
    }
  
    try {
      // Call the API function
      const response = await joinQueueAPI(serviceId, this.userId);
      
      // Create entry with fields matching what the API returns
      this.currentEntry = {
        id: response.data.entryId,
        entryId: response.data.entryId,
        service_id: serviceId,  // Use service_id (matches database)
        serviceId: serviceId,   // Also keep serviceId for compatibility
        position: response.data.position,
        userId: this.userId,
        status: 'waiting',
        joined_at: new Date().toISOString()
      };
  
      this.currentService = serviceId;
      
      // Subscribe to service updates via WebSocket
      if (socket) {
        socket.emit('join-service', serviceId);
      }
  
      showNotification(`✓ Joined! Position: #${response.data.position}`, 'success');
      
      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh queues
      await this.refreshQueues();
    } catch (error) {
      console.error('Error joining queue:', error);
      showNotification('Failed to join queue', 'error');
    }
  }

  async leaveQueue() {
    if (!this.currentEntry) {
      showNotification('Not in any queue', 'error');
      return;
    }
  
    try {
      await leaveQueueAPI(this.currentEntry.entryId);
      
      // Unsubscribe from service updates
      if (socket && this.currentService) {
        socket.emit('leave-service', this.currentService);
      }
  
      this.currentEntry = null;
      this.currentService = null;
      showNotification('✓ Left queue', 'success');
      await this.refreshQueues();
    } catch (error) {
      console.error('Error leaving queue:', error);
      showNotification('Failed to leave queue', 'error');
    }
  }
  async refreshQueues() {
    try {
      // First, get all queue data
      const queuesResponse = await getAllQueues();
      this.queuesData = queuesResponse.data || {};
      
      console.log('Queue data loaded:', this.queuesData);
      
      // Then update current entry if it exists
      if (this.currentEntry) {
        try {
          const entryResponse = await getQueuePosition(this.currentEntry.entryId);
          
          if (entryResponse.data) {
            this.currentEntry = entryResponse.data;
            console.log('Updated current entry:', this.currentEntry);
          } else {
            this.currentEntry = null;
          }
        } catch (err) {
          console.log('Entry not found, clearing current entry');
          this.currentEntry = null;
        }
      }
      
      this.renderMyQueue();
      this.renderStats();
    } catch (error) {
      console.error('Error refreshing queues:', error);
    }
  }

  handleQueueUpdate(data) {
    console.log('Handling queue update:', data);
    if (data.queue) {
      this.queuesData[data.serviceId] = data.queue;
      this.renderMyQueue();
      this.renderStats();
    }
  }

  // ... inside class QueueUpApp
// ...

renderMyQueue() {
  const container = document.getElementById('myQueue');
  
  if (!this.currentEntry) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No active queue</p>';
    return;
  }

  // Use service_id from database, not serviceId
  const serviceId = this.currentEntry.service_id || this.currentEntry.serviceId;
  const queueStatus = this.queuesData[serviceId];

  if (!queueStatus) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">Queue status not found</p>';
    return;
  }

  // Get service name
  let serviceName = 'Service';
  if (queueStatus.service && queueStatus.service.name) {
    serviceName = queueStatus.service.name;
  } else {
    const svc = this.services.find(s => s.id === serviceId);
    if (svc) serviceName = svc.name;
  }

  const estimatedWait = Math.round((queueStatus.avgWaitTime || 0) / 60);
  const position = this.currentEntry.position || 0;
  const status = this.currentEntry.status || 'waiting';

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div class="text-center">
        <p class="text-gray-600 text-sm mb-2">Your Position</p>
        <div class="text-6xl font-bold text-blue-600 mb-2">#${position}</div>
        <p class="text-gray-700 font-semibold">${serviceName}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-blue-50 rounded-lg p-4 text-center">
          <p class="text-gray-600 text-sm mb-1">Queue Length</p>
          <p class="text-2xl font-bold text-blue-600">${queueStatus.queueLength || 0}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center">
          <p class="text-gray-600 text-sm mb-1">Est. Wait</p>
          <p class="text-2xl font-bold text-green-600">${estimatedWait} min</p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Status:</span>
          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
            ${status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Joined:</span>
          <span class="text-gray-800 font-mono">${this.currentEntry.joined_at ? new Date(this.currentEntry.joined_at).toLocaleTimeString() : 'Now'}</span>
        </div>
      </div>

      <button onclick="app.leaveQueue()" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition">
        Leave Queue
      </button>
    </div>
  `;
}

  renderStats() {
    const container = document.getElementById('statsGrid');
    
    if (!this.queuesData || Object.keys(this.queuesData).length === 0) {
      container.innerHTML = '<p class="text-gray-500">No queue data</p>';
      return;
    }

    const statsHTML = Object.entries(this.queuesData).map(([serviceId, status]) => {
      if (!status || !status.service) return '';

      const colors = SERVICE_COLORS[serviceId] || SERVICE_COLORS.default;
      const icon = SERVICE_ICONS[serviceId] || '📋';

      return `
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800">${icon} ${status.service.name}</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">In Queue:</span>
              <span class="text-2xl font-bold text-blue-600">${status.queueLength || 0}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Avg Wait:</span>
              <span class="font-semibold text-gray-800">${Math.round((status.avgWaitTime || 0) / 60)} min</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = statsHTML;
  }
}




// Initialize
let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new QueueUpApp();
  app.init();
}); 