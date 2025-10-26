import { API_BASE_URL } from './constants.js';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

async function joinQueue(serviceId, userId) {
  return request('/queue/join', {
    method: 'POST',
    body: JSON.stringify({ serviceId, userId })
  });
}

async function getQueuePosition(entryId) {
  return request(`/queue/${entryId}`);
}

async function leaveQueue(entryId) {
  return request(`/queue/${entryId}`, { method: 'DELETE' });
}

async function getQueueStatus(serviceId) {
  return request(`/queue/service/${serviceId}/status`);
}

async function getAllQueues() {
  return request('/queue');
}

async function getServices() {
  return request('/services');
}

async function getHealth() {
  return request('/health');
}

export { request, joinQueue, getQueuePosition, leaveQueue, getQueueStatus, getAllQueues, getServices, getHealth };