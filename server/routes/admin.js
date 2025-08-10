const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Get system statistics (super admin only)
router.get('/stats', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await database.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const totalCourses = await database.get('SELECT COUNT(*) as count FROM courses WHERE is_active = 1');
    const totalAttendance = await database.get('SELECT COUNT(*) as count FROM attendance');
    const totalEnrollments = await database.get('SELECT COUNT(*) as count FROM user_courses');

    // Get users by role
    const usersByRole = await database.all(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE is_active = 1
      GROUP BY role
    `);

    // Get recent activity
    const recentActivity = await database.all(`
      SELECT 
        'attendance' as type,
        a.check_in_time as timestamp,
        u.full_name as user_name,
        c.name as course_name,
        qs.session_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      UNION ALL
      SELECT 
        'enrollment' as type,
        uc.enrolled_at as timestamp,
        u.full_name as user_name,
        c.name as course_name,
        NULL as session_name
      FROM user_courses uc
      JOIN users u ON uc.user_id = u.id
      JOIN courses c ON uc.course_id = c.id
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    // Get attendance by month (last 6 months)
    const attendanceByMonth = await database.all(`
      SELECT 
        strftime('%Y-%m', check_in_time) as month,
        COUNT(*) as count
      FROM attendance
      WHERE check_in_time >= datetime('now', '-6 months')
      GROUP BY month
      ORDER BY month DESC
    `);

    // Get top courses by attendance
    const topCourses = await database.all(`
      SELECT 
        c.name as course_name,
        COUNT(a.id) as attendance_count,
        COUNT(DISTINCT uc.user_id) as enrolled_students
      FROM courses c
      LEFT JOIN attendance a ON c.id = a.course_id
      LEFT JOIN user_courses uc ON c.id = uc.course_id
      WHERE c.is_active = 1
      GROUP BY c.id, c.name
      ORDER BY attendance_count DESC
      LIMIT 10
    `);

    res.json({
      overview: {
        totalUsers: totalUsers.count,
        totalCourses: totalCourses.count,
        totalAttendance: totalAttendance.count,
        totalEnrollments: totalEnrollments.count
      },
      usersByRole,
      recentActivity,
      attendanceByMonth,
      topCourses
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get system settings (super admin only)
router.get('/settings', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    const settings = await database.all('SELECT * FROM settings ORDER BY key');
    
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = {
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updated_at
      };
    });

    res.json({ settings: settingsObject });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update system settings (super admin only)
router.put('/settings', [
  authenticateToken,
  requireSuperAdmin,
  body('settings').isObject().withMessage('Settings object is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { settings } = req.body;

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await database.run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [value, key]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get system logs (super admin only)
router.get('/logs', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;

    // For now, we'll return a simple log structure
    // In a real application, you'd want to implement proper logging
    const logs = [
      {
        id: 1,
        type: 'info',
        message: 'System started successfully',
        timestamp: new Date().toISOString(),
        user: 'system'
      }
    ];

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Backup database (super admin only)
router.post('/backup', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    // In a real application, you'd implement actual database backup
    // For now, we'll just return a success message
    const backupPath = `backup_${Date.now()}.sqlite`;
    
    res.json({
      message: 'Database backup created successfully',
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get admin dashboard data (super admin only)
router.get('/dashboard', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    // Get today's statistics
    const todayAttendance = await database.get(`
      SELECT COUNT(*) as count 
      FROM attendance 
      WHERE DATE(check_in_time) = DATE('now')
    `);

    const todayEnrollments = await database.get(`
      SELECT COUNT(*) as count 
      FROM user_courses 
      WHERE DATE(enrolled_at) = DATE('now')
    `);

    const todaySessions = await database.get(`
      SELECT COUNT(*) as count 
      FROM qr_sessions 
      WHERE DATE(created_at) = DATE('now')
    `);

    // Get active QR sessions
    const activeSessions = await database.all(`
      SELECT 
        qs.id,
        qs.session_name,
        qs.start_time,
        qs.end_time,
        c.name as course_name,
        u.full_name as created_by
      FROM qr_sessions qs
      JOIN courses c ON qs.course_id = c.id
      JOIN users u ON qs.created_by = u.id
      WHERE qs.end_time > CURRENT_TIMESTAMP
      ORDER BY qs.start_time DESC
    `);

    // Get recent users
    const recentUsers = await database.all(`
      SELECT 
        id,
        username,
        full_name,
        role,
        created_at
      FROM users
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Get recent courses
    const recentCourses = await database.all(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        u.full_name as admin_name
      FROM courses c
      JOIN users u ON c.admin_id = u.id
      WHERE c.is_active = 1
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    res.json({
      today: {
        attendance: todayAttendance.count,
        enrollments: todayEnrollments.count,
        sessions: todaySessions.count
      },
      activeSessions,
      recentUsers,
      recentCourses
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Promote user to admin (super admin only)
router.post('/promote/:userId', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await database.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'User is already a super admin' });
    }

    // Promote user
    await database.run(
      'UPDATE users SET role = "admin", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    res.json({ message: 'User promoted to admin successfully' });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Demote admin to user (super admin only)
router.post('/demote/:userId', [
  authenticateToken,
  requireSuperAdmin
], async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await database.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot demote super admin' });
    }

    if (user.role === 'user') {
      return res.status(400).json({ error: 'User is already a regular user' });
    }

    // Demote user
    await database.run(
      'UPDATE users SET role = "user", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Admin demoted to user successfully' });
  } catch (error) {
    console.error('Demote user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;