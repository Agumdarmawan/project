const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.is_active = 1';
    let params = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }

    // Filter users based on admin role
    if (req.user.role === 'admin') {
      whereClause += ' AND u.role != "super_admin"';
    }

    // Get users with pagination
    const users = await database.all(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.phone,
        u.created_at,
        COUNT(uc.course_id) as enrolled_courses,
        COUNT(a.id) as total_attendance
      FROM users u
      LEFT JOIN user_courses uc ON u.id = uc.user_id
      LEFT JOIN attendance a ON u.id = a.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID (admin only)
router.get('/:userId', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await database.get(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.phone,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ? AND u.is_active = 1
    `, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check access permissions
    if (req.user.role === 'admin' && user.role === 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user's enrolled courses
    const enrolledCourses = await database.all(`
      SELECT 
        c.id,
        c.name,
        c.description,
        uc.enrolled_at,
        uc.max_attendance,
        COUNT(a.id) as attendance_count
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      LEFT JOIN attendance a ON u.id = a.user_id AND a.course_id = c.id
      WHERE uc.user_id = ?
      GROUP BY c.id
      ORDER BY uc.enrolled_at DESC
    `, [userId]);

    // Get user's recent attendance
    const recentAttendance = await database.all(`
      SELECT 
        a.check_in_time,
        c.name as course_name,
        qs.session_name
      FROM attendance a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      WHERE a.user_id = ?
      ORDER BY a.check_in_time DESC
      LIMIT 10
    `, [userId]);

    res.json({
      user: {
        ...user,
        enrolledCourses,
        recentAttendance
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:userId', [
  authenticateToken,
  requireAdmin,
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { full_name, email, phone, role } = req.body;

    // Check if user exists
    const existingUser = await database.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check access permissions
    if (req.user.role === 'admin' && existingUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify super admin' });
    }

    const updates = [];
    const params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name);
    }

    if (email) {
      // Check if email already exists
      const emailExists = await database.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      updates.push('email = ?');
      params.push(email);
    }

    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await database.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const updatedUser = await database.get(
      'SELECT id, username, email, full_name, role, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deactivate user (admin only)
router.delete('/:userId', [
  authenticateToken,
  requireAdmin
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

    // Check access permissions
    if (req.user.role === 'admin' && user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot deactivate super admin' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    // Soft delete user
    await database.run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics (admin only)
router.get('/:userId/stats', [
  authenticateToken,
  requireAdmin
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

    // Get total attendance count
    const totalAttendance = await database.get(
      'SELECT COUNT(*) as count FROM attendance WHERE user_id = ?',
      [userId]
    );

    // Get attendance by course
    const attendanceByCourse = await database.all(`
      SELECT 
        c.id,
        c.name as course_name,
        COUNT(a.id) as attendance_count,
        uc.max_attendance as max_attendance
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      LEFT JOIN attendance a ON a.user_id = uc.user_id AND a.course_id = c.id
      WHERE uc.user_id = ?
      GROUP BY c.id, c.name, uc.max_attendance
      ORDER BY c.name
    `, [userId]);

    // Get attendance by month (last 6 months)
    const attendanceByMonth = await database.all(`
      SELECT 
        strftime('%Y-%m', check_in_time) as month,
        COUNT(*) as count
      FROM attendance
      WHERE user_id = ? AND check_in_time >= datetime('now', '-6 months')
      GROUP BY month
      ORDER BY month DESC
    `, [userId]);

    // Get recent activity
    const recentActivity = await database.all(`
      SELECT 
        'attendance' as type,
        a.check_in_time as timestamp,
        c.name as course_name,
        qs.session_name
      FROM attendance a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      WHERE a.user_id = ?
      UNION ALL
      SELECT 
        'enrollment' as type,
        uc.enrolled_at as timestamp,
        c.name as course_name,
        NULL as session_name
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `, [userId, userId]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      stats: {
        totalAttendance: totalAttendance.count,
        attendanceByCourse,
        attendanceByMonth,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;