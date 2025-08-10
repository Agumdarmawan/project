const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, isEnrolledInCourse } = require('../middleware/auth');

const router = express.Router();

// Mark attendance via QR code
router.post('/check-in', [
  authenticateToken,
  body('qrData').notEmpty().withMessage('QR data is required'),
  body('location').optional().isString().withMessage('Location must be a string'),
  body('deviceInfo').optional().isString().withMessage('Device info must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { qrData, location, deviceInfo } = req.body;

    // Get QR code info
    const qrCode = await database.get(`
      SELECT 
        qc.*,
        c.name as course_name,
        c.max_attendance as course_max_attendance,
        uc.max_attendance as user_max_attendance
      FROM qr_codes qc
      JOIN courses c ON qc.course_id = c.id
      LEFT JOIN user_courses uc ON uc.user_id = ? AND uc.course_id = qc.course_id
      WHERE qc.qr_data = ? AND qc.is_active = 1 AND qc.expires_at > CURRENT_TIMESTAMP
    `, [req.user.id, qrData]);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found or expired' });
    }

    // Check if user is enrolled in the course
    if (req.user.role === 'user') {
      const enrollment = await database.get(
        'SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?',
        [req.user.id, qrCode.course_id]
      );

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    // Check if already checked in for this QR code
    const existingAttendance = await database.get(
      'SELECT * FROM attendance WHERE user_id = ? AND qr_code = ?',
      [req.user.id, qrData]
    );

    if (existingAttendance) {
      return res.status(400).json({ error: 'Already checked in for this session' });
    }

    // Check attendance limits
    const maxAttendance = qrCode.user_max_attendance || qrCode.course_max_attendance || 0;
    if (maxAttendance > 0) {
      const attendanceCount = await database.get(
        'SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND course_id = ?',
        [req.user.id, qrCode.course_id]
      );

      if (attendanceCount.count >= maxAttendance) {
        return res.status(400).json({ 
          error: 'Maximum attendance limit reached for this course',
          limit: maxAttendance,
          current: attendanceCount.count
        });
      }
    }

    // Record attendance
    const result = await database.run(
      'INSERT INTO attendance (user_id, course_id, qr_code, location, device_info) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, qrCode.course_id, qrData, location, deviceInfo]
    );

    res.json({
      message: 'Attendance recorded successfully',
      attendance: {
        id: result.id,
        courseName: qrCode.course_name,
        checkInTime: new Date().toISOString(),
        location,
        deviceInfo
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's attendance history
router.get('/history', [
  authenticateToken
], async (req, res) => {
  try {
    const { page = 1, limit = 10, courseId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.user_id = ?';
    let params = [req.user.id];

    if (courseId) {
      whereClause += ' AND a.course_id = ?';
      params.push(courseId);
    }

    // Get attendance records with pagination
    const attendance = await database.all(`
      SELECT 
        a.id,
        a.check_in_time,
        a.location,
        a.device_info,
        c.name as course_name,
        c.description as course_description,
        qs.session_name
      FROM attendance a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      ${whereClause}
      ORDER BY a.check_in_time DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM attendance a ${whereClause}`,
      params
    );

    res.json({
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance statistics for user
router.get('/stats', [
  authenticateToken
], async (req, res) => {
  try {
    // Get total attendance count
    const totalAttendance = await database.get(
      'SELECT COUNT(*) as count FROM attendance WHERE user_id = ?',
      [req.user.id]
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
    `, [req.user.id]);

    // Get recent attendance (last 7 days)
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
      WHERE a.user_id = ? AND a.check_in_time >= datetime('now', '-7 days')
      ORDER BY a.check_in_time DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({
      totalAttendance: totalAttendance.count,
      attendanceByCourse,
      recentAttendance
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get course attendance (admin only)
router.get('/course/:courseId', [
  authenticateToken,
  isEnrolledInCourse
], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { date, sessionId } = req.query;

    let whereClause = 'WHERE a.course_id = ?';
    let params = [courseId];

    if (date) {
      whereClause += ' AND DATE(a.check_in_time) = ?';
      params.push(date);
    }

    if (sessionId) {
      whereClause += ' AND qs.id = ?';
      params.push(sessionId);
    }

    // Get attendance records
    const attendance = await database.all(`
      SELECT 
        a.id,
        a.check_in_time,
        a.location,
        a.device_info,
        u.full_name,
        u.username,
        u.email,
        qs.session_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      ${whereClause}
      ORDER BY a.check_in_time DESC
    `, params);

    // Get course info
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );

    // Get total enrolled students
    const enrolledCount = await database.get(
      'SELECT COUNT(*) as count FROM user_courses WHERE course_id = ?',
      [courseId]
    );

    res.json({
      course,
      attendance,
      enrolledCount: enrolledCount.count,
      attendanceCount: attendance.length
    });
  } catch (error) {
    console.error('Get course attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export attendance data (admin only)
router.get('/export/:courseId', [
  authenticateToken,
  isEnrolledInCourse
], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { format = 'json', date } = req.query;

    let whereClause = 'WHERE a.course_id = ?';
    let params = [courseId];

    if (date) {
      whereClause += ' AND DATE(a.check_in_time) = ?';
      params.push(date);
    }

    const attendance = await database.all(`
      SELECT 
        u.full_name,
        u.username,
        u.email,
        a.check_in_time,
        a.location,
        qs.session_name,
        c.name as course_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.qr_data = a.qr_code LIMIT 1
      )
      ${whereClause}
      ORDER BY a.check_in_time DESC
    `, params);

    if (format === 'csv') {
      const csvHeader = 'Name,Username,Email,Check-in Time,Location,Session,Course\n';
      const csvData = attendance.map(record => 
        `"${record.full_name}","${record.username}","${record.email}","${record.check_in_time}","${record.location || ''}","${record.session_name || ''}","${record.course_name}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance_${courseId}_${date || 'all'}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        courseId,
        date: date || 'all',
        attendance,
        total: attendance.length
      });
    }
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;