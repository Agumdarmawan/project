const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Courses table
      db.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          max_attendance INTEGER DEFAULT 0,
          admin_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (admin_id) REFERENCES users (id)
        )
      `);

      // User-Course enrollments
      db.run(`
        CREATE TABLE IF NOT EXISTS user_courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          max_attendance INTEGER DEFAULT 0,
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (course_id) REFERENCES courses (id),
          UNIQUE(user_id, course_id)
        )
      `);

      // Attendance records
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          qr_code TEXT NOT NULL,
          location TEXT,
          device_info TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (course_id) REFERENCES courses (id)
        )
      `);

      // QR Codes table
      db.run(`
        CREATE TABLE IF NOT EXISTS qr_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          course_id INTEGER NOT NULL,
          qr_data TEXT NOT NULL,
          expires_at DATETIME,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (course_id) REFERENCES courses (id)
        )
      `);

      // Sessions table for QR codes
      db.run(`
        CREATE TABLE IF NOT EXISTS qr_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          course_id INTEGER NOT NULL,
          session_name TEXT NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          qr_code_id INTEGER,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (course_id) REFERENCES courses (id),
          FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Tables created successfully');
      resolve();
    });
  });
};

// Create default super admin
const createDefaultSuperAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['superadmin', 'superadmin@tutoring.com', hashedPassword, 'Super Administrator', 'super_admin'], (err) => {
      if (err) {
        console.error('Error creating super admin:', err);
        reject(err);
      } else {
        console.log('Default super admin created (username: superadmin, password: admin123)');
        resolve();
      }
    });
  });
};

// Insert default settings
const insertDefaultSettings = () => {
  return new Promise((resolve, reject) => {
    const settings = [
      ['site_name', 'QR Attendance Tracker', 'Name of the tutoring service'],
      ['max_qr_duration', '3600', 'Maximum QR code duration in seconds'],
      ['attendance_window', '300', 'Time window for attendance in seconds'],
      ['enable_location', 'true', 'Enable location tracking for attendance'],
      ['enable_device_info', 'true', 'Enable device information collection']
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)');
    
    settings.forEach(setting => {
      stmt.run(setting);
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Error inserting settings:', err);
        reject(err);
      } else {
        console.log('Default settings inserted');
        resolve();
      }
    });
  });
};

// Initialize database
const initDatabase = async () => {
  try {
    await createTables();
    await createDefaultSuperAdmin();
    await insertDefaultSettings();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    db.close();
  }
};

initDatabase();