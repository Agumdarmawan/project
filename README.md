# QR Attendance Tracker

A comprehensive web application for QR-based attendance tracking designed specifically for tutoring services. The system supports three user roles with different levels of access and functionality.

## Features

### 🔐 Authentication & Authorization
- Secure JWT-based authentication
- Role-based access control (Super Admin, Admin, User)
- Password hashing with bcrypt
- Session management

### 📱 QR Code Functionality
- Generate QR codes for attendance sessions
- Real-time QR code scanning via web camera
- QR code expiration and validation
- Session-based QR codes with custom durations

### 👥 User Management
- **Super Admin**: Full system control, user management, global settings
- **Admin**: Course management, user enrollment, attendance tracking
- **User**: Self check-in, course enrollment, attendance history

### 📊 Attendance Tracking
- Per-course attendance tracking
- Maximum attendance limits per user/course
- Attendance history and statistics
- Export attendance data (CSV/JSON)
- Real-time attendance monitoring

### 🎓 Course Management
- Create and manage courses
- Enroll/unenroll students
- Set attendance limits
- Course-specific QR sessions

### 📈 Analytics & Reporting
- Dashboard with attendance statistics
- Course-wise attendance reports
- User activity tracking
- Export functionality

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **QRCode** library for QR generation
- **express-validator** for input validation

### Frontend
- **React.js** with functional components
- **React Router** for navigation
- **Axios** for API communication
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **React QR Reader** for QR scanning

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd qr-attendance-tracker
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Return to root
cd ..
```

### 3. Environment Configuration
```bash
# Copy environment example
cp server/.env.example server/.env

# Edit the environment file
nano server/.env
```

Update the following variables in `server/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:3000
```

### 4. Initialize Database
```bash
cd server
npm run init-db
```

This will create the database with default tables and a super admin user:
- **Username**: `superadmin`
- **Password**: `admin123`

### 5. Start the Application

#### Development Mode (Both frontend and backend)
```bash
# From root directory
npm run dev
```

#### Production Mode
```bash
# Build the frontend
npm run build

# Start the server
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage Guide

### Super Admin
1. **Login** with super admin credentials
2. **Manage Users**: Create, edit, and deactivate user accounts
3. **System Settings**: Configure global application settings
4. **Admin Panel**: View system-wide statistics and activity
5. **Course Management**: Create and manage all courses
6. **User Promotion**: Promote users to admin role

### Admin
1. **Login** with admin credentials
2. **Course Management**: Create and manage assigned courses
3. **QR Generation**: Generate QR codes for attendance sessions
4. **User Enrollment**: Enroll students in courses
5. **Attendance Monitoring**: View and export attendance records
6. **User Management**: Manage students in their courses

### User (Student)
1. **Login** with student credentials
2. **QR Scanner**: Scan QR codes to mark attendance
3. **Course View**: View enrolled courses and attendance history
4. **Dashboard**: See personal attendance statistics
5. **Profile Management**: Update personal information

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify JWT token

### QR Codes
- `POST /api/qr/generate` - Generate QR code (admin only)
- `GET /api/qr/course/:courseId` - Get active QR codes for course
- `GET /api/qr/course/:courseId/history` - Get QR code history
- `PUT /api/qr/deactivate/:qrCodeId` - Deactivate QR code
- `GET /api/qr/info/:qrData` - Get QR code information

### Attendance
- `POST /api/attendance/check-in` - Mark attendance via QR
- `GET /api/attendance/history` - Get attendance history
- `GET /api/attendance/stats` - Get attendance statistics
- `GET /api/attendance/course/:courseId` - Get course attendance
- `GET /api/attendance/export/:courseId` - Export attendance data

### Courses
- `POST /api/courses` - Create course (admin only)
- `GET /api/courses` - Get courses
- `GET /api/courses/:courseId` - Get course details
- `PUT /api/courses/:courseId` - Update course
- `DELETE /api/courses/:courseId` - Delete course
- `POST /api/courses/:courseId/enroll` - Enroll user in course
- `DELETE /api/courses/:courseId/enroll/:userId` - Remove user from course

### Users
- `GET /api/users` - Get users (admin only)
- `GET /api/users/:userId` - Get user details
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Deactivate user
- `GET /api/users/:userId/stats` - Get user statistics

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings
- `GET /api/admin/dashboard` - Get admin dashboard data
- `POST /api/admin/promote/:userId` - Promote user to admin
- `POST /api/admin/demote/:userId` - Demote admin to user

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password` - Hashed password
- `full_name` - User's full name
- `role` - User role (super_admin, admin, user)
- `phone` - Phone number
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp
- `is_active` - Account status

### Courses Table
- `id` - Primary key
- `name` - Course name
- `description` - Course description
- `max_attendance` - Maximum attendance limit
- `admin_id` - Course administrator
- `created_at` - Course creation timestamp
- `updated_at` - Last update timestamp
- `is_active` - Course status

### User Courses Table
- `id` - Primary key
- `user_id` - User ID
- `course_id` - Course ID
- `max_attendance` - User-specific attendance limit
- `enrolled_at` - Enrollment timestamp

### Attendance Table
- `id` - Primary key
- `user_id` - User ID
- `course_id` - Course ID
- `check_in_time` - Attendance timestamp
- `qr_code` - QR code data
- `location` - Check-in location
- `device_info` - Device information

### QR Codes Table
- `id` - Primary key
- `course_id` - Course ID
- `qr_data` - QR code data
- `expires_at` - Expiration timestamp
- `is_active` - QR code status
- `created_at` - Creation timestamp

### QR Sessions Table
- `id` - Primary key
- `course_id` - Course ID
- `session_name` - Session name
- `start_time` - Session start time
- `end_time` - Session end time
- `qr_code_id` - Associated QR code
- `created_by` - Creator user ID
- `created_at` - Creation timestamp

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured CORS for security
- **Helmet**: Security headers middleware
- **Role-based Access**: Granular permission system

## Deployment

### Production Considerations
1. **Environment Variables**: Set proper production environment variables
2. **Database**: Consider using PostgreSQL or MySQL for production
3. **HTTPS**: Enable HTTPS for secure communication
4. **JWT Secret**: Use a strong, unique JWT secret
5. **Rate Limiting**: Adjust rate limits for production traffic
6. **Logging**: Implement proper logging and monitoring
7. **Backup**: Set up regular database backups

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository or contact the development team.

## Changelog

### v1.0.0
- Initial release
- Complete QR attendance tracking system
- Role-based access control
- Real-time QR scanning
- Comprehensive reporting
- User management system
