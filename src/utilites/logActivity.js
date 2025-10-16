const ActivityLog = require('../models/ActivityLogSchema');

async function logActivity({ usr_id, type, description }) {
  try {
    await ActivityLog.create({
      usr_id,
      type,
      description,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

module.exports = logActivity;
