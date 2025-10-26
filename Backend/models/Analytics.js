import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

class AnalyticsModel {
  // Log queue event
  async logEvent(serviceId, eventType, queueLength, avgWaitTime) {
    try {
      const id = uuidv4();
      await db.run(
        `INSERT INTO queue_analytics 
         (id, service_id, event_type, queue_length, avg_wait_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, serviceId, eventType, queueLength, avgWaitTime]
      );
      return id;
    } catch (err) {
      console.error('Error logging event:', err);
      throw err;
    }
  }

  // Get analytics for a service (last 24 hours)
  async getServiceAnalytics(serviceId) {
    try {
      const analytics = await db.all(
        `SELECT * FROM queue_analytics 
         WHERE service_id = ? 
         AND timestamp > datetime('now', '-1 day')
         ORDER BY timestamp DESC`,
        [serviceId]
      );

      return {
        events: analytics || [],
        totalEvents: analytics?.length || 0,
        avgWaitTime: this.calculateAvgWaitTime(analytics),
        peakQueueLength: this.calculatePeakQueue(analytics),
        peakTime: this.calculatePeakTime(analytics)
      };
    } catch (err) {
      console.error('Error getting analytics:', err);
      throw err;
    }
  }

  // Get all services analytics
  async getAllAnalytics() {
    try {
      const services = await db.all('SELECT id FROM services');
      const result = {};

      for (const service of services) {
        result[service.id] = await this.getServiceAnalytics(service.id);
      }

      return result;
    } catch (err) {
      console.error('Error getting all analytics:', err);
      throw err;
    }
  }

  // Calculate average wait time
  calculateAvgWaitTime(events) {
    if (!events || events.length === 0) return 0;
    const total = events.reduce((sum, e) => sum + (e.avg_wait_time || 0), 0);
    return Math.round(total / events.length);
  }

  // Calculate peak queue length
  calculatePeakQueue(events) {
    if (!events || events.length === 0) return 0;
    return Math.max(...events.map(e => e.queue_length || 0));
  }

  // Calculate peak time
  calculatePeakTime(events) {
    if (!events || events.length === 0) return null;
    
    const times = events
      .filter(e => e.queue_length > 0)
      .sort((a, b) => b.queue_length - a.queue_length);
    
    if (times.length === 0) return null;
    
    const peakEvent = times[0];
    return new Date(peakEvent.timestamp).toLocaleTimeString();
  }

  // Get daily statistics
  async getDailyStats(serviceId, date) {
    try {
      const stats = await db.get(
        `SELECT * FROM service_stats 
         WHERE service_id = ? AND date = ?`,
        [serviceId, date]
      );
      return stats;
    } catch (err) {
      console.error('Error getting daily stats:', err);
      throw err;
    }
  }

  // Save daily statistics
  async saveDailyStats(serviceId, date, totalServed, avgWait, peakQueue, peakTime) {
    try {
      const id = uuidv4();
      await db.run(
        `INSERT OR REPLACE INTO service_stats 
         (id, service_id, date, total_served, avg_wait_time, peak_queue_length, peak_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, serviceId, date, totalServed, avgWait, peakQueue, peakTime]
      );
      return id;
    } catch (err) {
      console.error('Error saving daily stats:', err);
      throw err;
    }
  }
}

export default new AnalyticsModel();