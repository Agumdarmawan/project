const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, requireAdmin, canAccessCourse } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Generate QR code for a course
router.post('/generate', [
  authenticateToken,
  requireAdmin,
  body('courseId').isInt().withMessage('Valid course ID is required'),
  body('sessionName').notEmpty().withMessage('Session name is required'),
  body('duration').optional().isInt({ min: 300, max: 7200 }).withMessage('Duration must be between 5 minutes and 2 hours')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, sessionName, duration = 3600 } = req.body;

    // Check if course exists and user has access
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ? AND is_active = 1',
      [courseId]
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && course.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Generate unique QR data
    const qrData = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + duration * 1000);

    // Create QR session
    const sessionResult = await database.run(
      'INSERT INTO qr_sessions (course_id, session_name, start_time, end_time, created_by) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)',
      [courseId, sessionName, expiresAt.toISOString(), req.user.id]
    );

    // Create QR code record
    const qrResult = await database.run(
      'INSERT INTO qr_codes (course_id, qr_data, expires_at) VALUES (?, ?, ?)',
      [courseId, qrData, expiresAt.toISOString()]
    );

    // Update session with QR code ID
    await database.run(
      'UPDATE qr_sessions SET qr_code_id = ? WHERE id = ?',
      [qrResult.id, sessionResult.id]
    );

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      message: 'QR code generated successfully',
      qrCode: {
        id: qrResult.id,
        data: qrData,
        image: qrCodeImage,
        expiresAt: expiresAt.toISOString(),
        sessionId: sessionResult.id,
        sessionName
      }
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active QR codes for a course
router.get('/course/:courseId', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check access permissions
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ? AND is_active = 1',
      [courseId]
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role !== 'super_admin' && course.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Get active QR sessions
    const sessions = await database.all(`
      SELECT 
        qs.id,
        qs.session_name,
        qs.start_time,
        qs.end_time,
        qs.created_at,
        qc.qr_data,
        qc.is_active,
        u.full_name as created_by_name
      FROM qr_sessions qs
      LEFT JOIN qr_codes qc ON qs.qr_code_id = qc.id
      LEFT JOIN users u ON qs.created_by = u.id
      WHERE qs.course_id = ? AND qs.end_time > CURRENT_TIMESTAMP
      ORDER BY qs.created_at DESC
    `, [courseId]);

    res.json({ sessions });
  } catch (error) {
    console.error('Get QR sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get QR code history for a course
router.get('/course/:courseId/history', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check access permissions
    const course = await database.get(
      'SELECT * FROM courses WHERE id = ? AND is_active = 1',
      [courseId]
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role !== 'super_admin' && course.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Get QR sessions with pagination
    const sessions = await database.all(`
      SELECT 
        qs.id,
        qs.session_name,
        qs.start_time,
        qs.end_time,
        qs.created_at,
        u.full_name as created_by_name,
        COUNT(a.id) as attendance_count
      FROM qr_sessions qs
      LEFT JOIN users u ON qs.created_by = u.id
      LEFT JOIN attendance a ON qs.qr_code_id = (
        SELECT qc.id FROM qr_codes qc WHERE qc.course_id = qs.course_id AND qc.created_at BETWEEN qs.start_time AND qs.end_time LIMIT 1
      )
      WHERE qs.course_id = ?
      GROUP BY qs.id
      ORDER BY qs.created_at DESC
      LIMIT ? OFFSET ?
    `, [courseId, limit, offset]);

    // Get total count
    const totalResult = await database.get(
      'SELECT COUNT(*) as total FROM qr_sessions WHERE course_id = ?',
      [courseId]
    );

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get QR history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deactivate QR code
router.put('/deactivate/:qrCodeId', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    // Get QR code with course info
    const qrCode = await database.get(`
      SELECT qc.*, c.admin_id 
      FROM qr_codes qc
      JOIN courses c ON qc.course_id = c.id
      WHERE qc.id = ?
    `, [qrCodeId]);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && qrCode.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this QR code' });
    }

    // Deactivate QR code
    await database.run(
      'UPDATE qr_codes SET is_active = 0 WHERE id = ?',
      [qrCodeId]
    );

    res.json({ message: 'QR code deactivated successfully' });
  } catch (error) {
    console.error('Deactivate QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get QR code info (for scanning)
router.get('/info/:qrData', [
  authenticateToken
], async (req, res) => {
  try {
    const { qrData } = req.params;

    // Get QR code info
    const qrCode = await database.get(`
      SELECT 
        qc.*,
        c.name as course_name,
        c.description as course_description,
        qs.session_name
      FROM qr_codes qc
      JOIN courses c ON qc.course_id = c.id
      LEFT JOIN qr_sessions qs ON qs.qr_code_id = qc.id
      WHERE qc.qr_data = ? AND qc.is_active = 1 AND qc.expires_at > CURRENT_TIMESTAMP
    `, [qrData]);

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

    res.json({
      qrCode: {
        id: qrCode.id,
        courseId: qrCode.course_id,
        courseName: qrCode.course_name,
        courseDescription: qrCode.course_description,
        sessionName: qrCode.session_name,
        expiresAt: qrCode.expires_at
      }
    });
  } catch (error) {
    console.error('Get QR info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;