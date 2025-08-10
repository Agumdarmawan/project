const jwt = require('jsonwebtoken');
const database = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await database.get(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Super admin only
const requireSuperAdmin = requireRole(['super_admin']);

// Admin or super admin
const requireAdmin = requireRole(['admin', 'super_admin']);

// Any authenticated user
const requireUser = requireRole(['user', 'admin', 'super_admin']);

// Check if user can access course (admin of course or super admin)
const canAccessCourse = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    // Super admin can access all courses
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user is admin of the course
    const course = await database.get(
      'SELECT admin_id FROM courses WHERE id = ?',
      [courseId]
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.admin_id === req.user.id) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied to this course' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// Check if user is enrolled in course
const isEnrolledInCourse = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    // Admins and super admins can access all courses
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      return next();
    }

    // Check if user is enrolled in the course
    const enrollment = await database.get(
      'SELECT * FROM user_courses WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    );

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireUser,
  canAccessCourse,
  isEnrolledInCourse
};