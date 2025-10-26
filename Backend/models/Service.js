import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

class ServiceModel {
  async createService(name, description, booths = 1, avgServiceTime = 300) {
    const serviceId = uuidv4();

    await db.run(
      `INSERT INTO services (id, name, description, booths, avg_service_time) 
       VALUES (?, ?, ?, ?, ?)`,
      [serviceId, name, description, booths, avgServiceTime]
    );

    // Create booth entries
    for (let i = 1; i <= booths; i++) {
      const boothId = uuidv4();
      await db.run(
        `INSERT INTO service_booths (id, service_id, booth_number, status) 
         VALUES (?, ?, ?, ?)`,
        [boothId, serviceId, i, 'available']
      );
    }

    return { serviceId };
  }

  async getServices() {
    return await db.all('SELECT * FROM services');
  }

  async getService(serviceId) {
    return await db.get(
      'SELECT * FROM services WHERE id = ?',
      [serviceId]
    );
  }

  async updateService(serviceId, updates) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    
    await db.run(
      `UPDATE services SET ${fields} WHERE id = ?`,
      [...values, serviceId]
    );

    return true;
  }
}

export default new ServiceModel();