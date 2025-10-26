import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

class QueueModel {
  async joinQueue(serviceId, userId) {
    try {
      const entryId = uuidv4();
      
      // Get next position
      const result = await db.get(
        'SELECT COUNT(*) as count FROM queue_entries WHERE service_id = ? AND status = ?',
        [serviceId, 'waiting']
      );
      
      const position = (result?.count || 0) + 1;

      await db.run(
        `INSERT INTO queue_entries 
         (id, service_id, user_id, position, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [entryId, serviceId, userId, position, 'waiting']
      );

      console.log(`✓ User ${userId} joined queue at position ${position}`);
      return { entryId, position };
    } catch (err) {
      console.error('Join queue error:', err);
      throw err;
    }
  }


  async serveNext(serviceId) {
    try {
      // Get the first waiting entry
      const entry = await db.get(
        `SELECT * FROM queue_entries 
         WHERE service_id = ? AND status = 'waiting' 
         ORDER BY position ASC LIMIT 1`,
        [serviceId]
      );
  
      if (entry) {
        // Mark as served
        await db.run(
          'UPDATE queue_entries SET status = ?, served_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['served', entry.id]
        );
  
        // Recalculate positions for remaining entries
        const remainingEntries = await db.all(
          'SELECT id FROM queue_entries WHERE service_id = ? AND status = ? ORDER BY joined_at ASC',
          [serviceId, 'waiting']
        );
  
        for (let i = 0; i < remainingEntries.length; i++) {
          await db.run(
            'UPDATE queue_entries SET position = ? WHERE id = ?',
            [i + 1, remainingEntries[i].id]
          );
        }
  
        console.log(`✓ Served: ${entry.user_id} from ${serviceId}`);
        return entry;
      }
      return null;
    } catch (err) {
      console.error('Error serving next:', err);
      throw err;
    }
  }
  
  async clearServed(serviceId) {
    try {
      const result = await db.run(
        'DELETE FROM queue_entries WHERE service_id = ? AND status = ?',
        [serviceId, 'served']
      );
      console.log(`✓ Cleared ${result.changes} served entries from ${serviceId}`);
      return result.changes;
    } catch (err) {
      console.error('Error clearing served:', err);
      throw err;
    }
  }
  
  async getQueueDetails(serviceId) {
    try {
      const allEntries = await db.all(
        `SELECT * FROM queue_entries 
         WHERE service_id = ? 
         ORDER BY CASE WHEN status = 'waiting' THEN 0 ELSE 1 END, position ASC`,
        [serviceId]
      );
  
      const waiting = allEntries.filter(e => e.status === 'waiting');
      const served = allEntries.filter(e => e.status === 'served');
  
      return {
        waiting,
        served,
        totalWaiting: waiting.length,
        totalServed: served.length
      };
    } catch (err) {
      console.error('Error getting queue details:', err);
      throw err;
    }
  }

  async getQueuePosition(entryId) {
    try {
      const entry = await db.get(
        'SELECT * FROM queue_entries WHERE id = ?',
        [entryId]
      );
      return entry;
    } catch (err) {
      console.error('Get position error:', err);
      throw err;
    }
  }

  async getQueueStatus(serviceId) {
    try {
      // Get all waiting queue entries
      const queue = await db.all(
        `SELECT * FROM queue_entries 
         WHERE service_id = ? AND status = 'waiting' 
         ORDER BY position ASC`,
        [serviceId]
      );

      // Get service info
      const service = await db.get(
        'SELECT * FROM services WHERE id = ?',
        [serviceId]
      );

      if (!service) {
        console.warn(`Service ${serviceId} not found`);
        return {
          queue: [],
          queueLength: 0,
          avgWaitTime: 0,
          service: null
        };
      }

      const avgServiceTime = service.avg_service_time || 300;
      const queueLength = queue?.length || 0;
      const avgWaitTime = queueLength * avgServiceTime;

      return {
        queue: queue || [],
        queueLength,
        avgWaitTime,
        service
      };
    } catch (err) {
      console.error(`Get queue status error for ${serviceId}:`, err);
      return {
        queue: [],
        queueLength: 0,
        avgWaitTime: 0,
        service: null
      };
    }
  }

  async leaveQueue(entryId) {
    try {
      // Get entry before deleting
      const entry = await db.get(
        'SELECT * FROM queue_entries WHERE id = ?',
        [entryId]
      );

      // Delete the entry
      await db.run(
        'DELETE FROM queue_entries WHERE id = ?',
        [entryId]
      );

      console.log(`✓ User left queue: ${entryId}`);
      return entry;
    } catch (err) {
      console.error('Leave queue error:', err);
      throw err;
    }
  }

  async getAllQueues() {
    try {
      const services = await db.all('SELECT * FROM services');
      
      if (!services || services.length === 0) {
        console.warn('No services found');
        return {};
      }

      const result = {};

      for (const service of services) {
        try {
          result[service.id] = await this.getQueueStatus(service.id);
        } catch (err) {
          console.error(`Error getting status for service ${service.id}:`, err);
          result[service.id] = {
            queue: [],
            queueLength: 0,
            avgWaitTime: 0,
            service
          };
        }
      }

      return result;
    } catch (err) {
      console.error('Get all queues error:', err);
      throw err;
    }
  }

  async clearQueue(serviceId) {
    try {
      await db.run(
        'DELETE FROM queue_entries WHERE service_id = ? AND status = ?',
        [serviceId, 'served']
      );
      return true;
    } catch (err) {
      console.error('Clear queue error:', err);
      throw err;
    }
  }
}

export default new QueueModel();