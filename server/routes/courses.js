const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, requireAdmin, canAccessCourse } = require('../middleware/auth');

const router = express.Router();

// Create course (admin only)
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name').notEmpty().withMessage('Course name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('maxAttendance').optional().isInt({ min: 0 }).withMessage('Max attendance must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, maxAttendance } = req.body;

    // Create course
    const result = await database.run(
      'INSERT INTO courses (name, description, max_attendance, admin_id) VALUES (?, ?, ?, ?)',
      [name, description, maxAttendance || 0, req.user.id]
    );

    // Get created course
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all courses (filtered by user role)
router.get('/', [
  authenticateToken
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.is_active = 1';
    let params = [];

    if (search) {
      whereClause += ' AND (c.name LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filter courses based on user role
    if (req.user.role === 'user') {
      whereClause += ' AND uc.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      whereClause += ' AND c.admin_id = ?';
      params.push(req.user.id);
    }
    // Super admin can see all courses

    // Get courses with pagination
    const courses = await database.all(`
      SELECT 
        c.*,
        u.full_name as admin_name,
        COUNT(uc2.user_id) as enrolled_students,
        COUNT(a.id) as total_attendance
      FROM courses c
      LEFT JOIN users u ON c.admin_id = u.id
      LEFT JOIN user_courses uc ON c.id = uc.course_id
      LEFT JOIN user_courses uc2 ON c.id = uc2.course_id
      LEFT JOIN attendance a ON c.id = a.course_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const totalResult = await database.get(
      `SELECT COUNT(DISTINCT c.id) as total FROM courses c LEFT JOIN user_courses uc ON c.id = uc.course_id ${whereClause}`,
      params
    );

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get course by ID
router.get('/:courseId', [
  authenticateToken
], async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get course details
    const course = await database.get(`
      SELECT 
        c.*,
        u.full_name as admin_name,
        u.email as admin_email
      FROM courses c
      LEFT JOIN users u ON c.admin_id = u.id
      WHERE c.id = ? AND c.is_active = 1
    `, [courseId]);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check access permissions
    if (req.user.role === 'user') {
      const enrollment = await database.get(
        'SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?',
        [req.user.id, courseId]
      );

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    } else if (req.user.role === 'admin' && course.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Get enrolled students count
    const enrolledCount = await database.get(
      'SELECT COUNT(*) as count FROM user_courses WHERE course_id = ?',
      [courseId]
    );

    // Get recent attendance
    const recentAttendance = await database.all(`
      SELECT 
        a.check_in_time,
        u.full_name,
        qs.session_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      WHERE a.course_id = ?
      ORDER BY a.check_in_time DESC
      LIMIT 5
    `, [courseId]);

    res.json({
      course: {
        ...course,
        enrolledCount: enrolledCount.count,
        recentAttendance
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update course (admin only)
router.put('/:courseId', [
  authenticateToken,
  requireAdmin,
  canAccessCourse,
  body('name').optional().notEmpty().withMessage('Course name cannot be empty'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('maxAttendance').optional().isInt({ min: 0 }).withMessage('Max attendance must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { name, description, maxAttendance } = req.body;

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (maxAttendance !== undefined) {
      updates.push('max_attendance = ?');
      params.push(maxAttendance);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(courseId);

    await database.run(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated course
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );

    res.json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete course (admin only)
router.delete('/:courseId', [
  authenticateToken,
  requireAdmin,
  canAccessCourse
], async (req, res) => {
  try {
    const { courseId } = req.params;

    // Soft delete course
    await database.run(
      'UPDATE courses SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [courseId]
    );

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll user in course (admin only)
router.post('/:courseId/enroll', [
  authenticateToken,
  requireAdmin,
  canAccessCourse,
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('maxAttendance').optional().isInt({ min: 0 }).withMessage('Max attendance must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { userId, maxAttendance } = req.body;

    // Check if user exists
    const user = await database.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await database.get(
      'SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existingEnrollment) {
      return res.status(400).json({ error: 'User is already enrolled in this course' });
    }

    // Enroll user
    await database.run(
      'INSERT INTO user_courses (user_id, course_id, max_attendance) VALUES (?, ?, ?)',
      [userId, courseId, maxAttendance || 0]
    );

    res.json({ message: 'User enrolled successfully' });
  } catch (error) {
    console.error('Enroll user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove user from course (admin only)
router.delete('/:courseId/enroll/:userId', [
  authenticateToken,
  requireAdmin,
  canAccessCourse
], async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    // Remove enrollment
    await database.run(
      'DELETE FROM user_courses WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    res.json({ message: 'User removed from course successfully' });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get enrolled users for a course
router.get('/:courseId/enrolled', [
  authenticateToken,
  canAccessCourse
], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get enrolled users with pagination
    const enrolledUsers = await database.all(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.phone,
        uc.enrolled_at,
        uc.max_attendance,
        COUNT(a.id) as attendance_count
      FROM user_courses uc
      JOIN users u ON uc.user_id = u.id
      LEFT JOIN attendance a ON u.id = a.user_id AND a.course_id = uc.course_id
      WHERE uc.course_id = ?
      GROUP BY u.id
      ORDER BY uc.enrolled_at DESC
      LIMIT ? OFFSET ?
    `, [courseId, limit, offset]);

    // Get total count
    const totalResult = await database.get(
      'SELECT COUNT(*) as total FROM user_courses WHERE course_id = ?',
      [courseId]
    );

    res.json({
      enrolledUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get enrolled users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;