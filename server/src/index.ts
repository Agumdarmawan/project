import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Types
interface JwtClaims {
  sub: string;
  role: Role;
}

// Auth helpers
function signToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtClaims;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(roles: Role | Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user.id, user.role);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, name: true, email: true, role: true } });
  return res.json({ user });
});

// Courses
app.post('/api/courses', authMiddleware, requireRole([Role.SUPER_ADMIN, Role.ADMIN]), async (req: any, res) => {
  const schema = z.object({ name: z.string().min(2), description: z.string().optional(), adminId: z.string().cuid().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { name, description, adminId } = parsed.data;
  let assignedAdminId = adminId;
  if (req.user.role === Role.ADMIN) {
    assignedAdminId = req.user.sub; // admins can only create courses for themselves
  }
  if (!assignedAdminId) return res.status(400).json({ error: 'adminId required' });
  const course = await prisma.course.create({ data: { name, description, adminId: assignedAdminId } });
  return res.json({ course });
});

app.get('/api/courses', authMiddleware, async (req: any, res) => {
  const role: Role = req.user.role;
  if (role === Role.SUPER_ADMIN) {
    const courses = await prisma.course.findMany({ include: { admin: true } });
    return res.json({ courses });
  }
  if (role === Role.ADMIN) {
    const courses = await prisma.course.findMany({ where: { adminId: req.user.sub } });
    return res.json({ courses });
  }
  // USER
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: req.user.sub }, include: { course: true } });
  const courses = enrollments.map((e) => e.course);
  return res.json({ courses });
});

// Enrollment management
app.post('/api/courses/:courseId/enroll', authMiddleware, requireRole([Role.SUPER_ADMIN, Role.ADMIN]), async (req: any, res) => {
  const { courseId } = req.params;
  const schema = z.object({ studentId: z.string().cuid(), maxAttendances: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  // Admins can only manage their own courses
  if (req.user.role === Role.ADMIN) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.adminId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  }
  const enrollment = await prisma.enrollment.upsert({
    where: { courseId_studentId: { courseId, studentId: parsed.data.studentId } },
    create: { courseId, studentId: parsed.data.studentId, maxAttendances: parsed.data.maxAttendances },
    update: { maxAttendances: parsed.data.maxAttendances },
  });
  res.json({ enrollment });
});

app.get('/api/courses/:courseId/enrollments', authMiddleware, requireRole([Role.SUPER_ADMIN, Role.ADMIN]), async (req: any, res) => {
  const { courseId } = req.params;
  if (req.user.role === Role.ADMIN) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.adminId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  }
  const enrollments = await prisma.enrollment.findMany({ where: { courseId }, include: { student: { select: { id: true, name: true, email: true } } } });
  res.json({ enrollments });
});

// Check-in sessions (create QR)
app.post('/api/courses/:courseId/sessions', authMiddleware, requireRole([Role.SUPER_ADMIN, Role.ADMIN]), async (req: any, res) => {
  const { courseId } = req.params;
  const schema = z.object({ expiresInMinutes: z.number().int().positive().max(8 * 60).default(30) }).partial();
  const parsed = schema.safeParse(req.body || {});
  if (req.user.role === Role.ADMIN) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.adminId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  }
  const minutes = (parsed.success && parsed.data.expiresInMinutes) || 30;
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  const session = await prisma.checkInSession.create({ data: { courseId, token, expiresAt } });
  // Encode a URL that the mobile client can open; frontend will intercept token
  const checkInUrl = `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/checkin?token=${token}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl);
  res.json({ session, qrDataUrl, checkInUrl });
});

// Self check-in by users
app.post('/api/attendance/checkin', authMiddleware, requireRole(Role.USER), async (req: any, res) => {
  const schema = z.object({ token: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const session = await prisma.checkInSession.findUnique({ where: { token: parsed.data.token } });
  if (!session || !session.isActive || new Date(session.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Session expired or invalid' });
  }
  // Ensure user enrolled
  const enrollment = await prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId: session.courseId, studentId: req.user.sub } }, include: { attendances: true } });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in course' });
  // Check quota
  const currentCount = await prisma.attendance.count({ where: { enrollmentId: enrollment.id } });
  if (currentCount >= enrollment.maxAttendances) return res.status(400).json({ error: 'Max attendances reached' });
  // Prevent duplicate for this session
  const exists = await prisma.attendance.findFirst({ where: { enrollmentId: enrollment.id, sessionId: session.id } });
  if (exists) return res.status(200).json({ ok: true, message: 'Already checked in', attendanceId: exists.id });
  const attendance = await prisma.attendance.create({ data: { enrollmentId: enrollment.id, sessionId: session.id } });
  res.json({ ok: true, attendance });
});

// My data
app.get('/api/my/courses', authMiddleware, requireRole(Role.USER), async (req: any, res) => {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: req.user.sub }, include: { course: true, attendances: true } });
  const data = enrollments.map((e) => ({
    course: e.course,
    maxAttendances: e.maxAttendances,
    attended: e.attendances.length,
  }));
  res.json({ courses: data });
});

app.get('/api/my/attendance', authMiddleware, requireRole(Role.USER), async (req: any, res) => {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: req.user.sub }, include: { attendances: { include: { session: true } }, course: true } });
  res.json({ enrollments });
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on :${PORT}`);
});