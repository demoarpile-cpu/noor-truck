/**
 * Inspection Controller
 * Handles Driver's Daily Vehicle Inspection Reports
 */

const pool = require('../config/db');

/**
 * Get all inspections (Admin only)
 */
const getAllInspections = async (req, res) => {
  try {
    const { startDate, endDate, truckId, driverId } = req.query;
    
    let query = `
      SELECT di.*, d.name as driver_name, t.truck_number as truck_no
      FROM daily_inspections di
      LEFT JOIN drivers d ON di.driver_id = d.id
      LEFT JOIN trucks t ON di.truck_id = t.id
      WHERE di.deleted_at IS NULL
    `;
    const params = [];

    if (startDate) {
      query += ' AND di.inspection_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND di.inspection_date <= ?';
      params.push(endDate);
    }
    if (truckId) {
      query += ' AND di.truck_id = ?';
      params.push(truckId);
    }
    if (driverId) {
      query += ' AND di.driver_id = ?';
      params.push(driverId);
    }

    query += ' ORDER BY di.inspection_date DESC, di.inspection_time DESC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[getAllInspections]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inspections', error: error.message });
  }
};

/**
 * Get inspection by ID
 */
const getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT di.*, d.name as driver_name, t.truck_number as truck_no
       FROM daily_inspections di
       LEFT JOIN drivers d ON di.driver_id = d.id
       LEFT JOIN trucks t ON di.truck_id = t.id
       WHERE di.id = ? AND di.deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection report not found' });
    }

    const report = rows[0];
    const userRole = req.user.role;

    // If driver, allow only their own report
    if (userRole === 'driver') {
      const driverId = req.user.driverId;
      if (report.driver_id !== driverId) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own reports.' });
      }
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[getInspectionById]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inspection details', error: error.message });
  }
};

/**
 * Create new inspection (Driver only)
 */
const createInspection = async (req, res) => {
  try {
    const data = req.body;
    
    // Calculate km_driven if both start and end are provided
    if (data.km_start && data.km_end) {
        data.km_driven = parseInt(data.km_end) - parseInt(data.km_start);
    }

    // Prepare fields and placeholders for dynamic insert
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO daily_inspections (${fields.join(', ')}) VALUES (${placeholders})`;
    
    const [result] = await pool.execute(query, values);

    res.status(201).json({
      success: true,
      message: 'Inspection report submitted successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('[createInspection]', error);
    res.status(500).json({ success: false, message: 'Failed to submit inspection report', error: error.message });
  }
};

/**
 * Get inspections for current driver
 */
const getMyInspections = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID not found for this user' });
    }

    const [rows] = await pool.execute(
      `SELECT di.*, t.truck_number as truck_no
       FROM daily_inspections di
       LEFT JOIN trucks t ON di.truck_id = t.id
       WHERE di.driver_id = ? AND di.deleted_at IS NULL
       ORDER BY di.inspection_date DESC`,
      [driverId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[getMyInspections]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your inspections', error: error.message });
  }
};

module.exports = {
  getAllInspections,
  getInspectionById,
  createInspection,
  getMyInspections
};
