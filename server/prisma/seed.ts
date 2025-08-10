import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.attendance.deleteMany();
  await prisma.checkInSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashAlice = await bcrypt.hash('password', 10);
  const passwordHashBob = await bcrypt.hash('password', 10);

  const superAdmin = await prisma.user.create({ data: { email: 'admin@root.com', name: 'Root Admin', passwordHash: passwordHashAdmin, role: Role.SUPER_ADMIN } });
  const courseAdmin = await prisma.user.create({ data: { email: 'alice@admin.com', name: 'Alice Admin', passwordHash: passwordHashAlice, role: Role.ADMIN } });
  const student = await prisma.user.create({ data: { email: 'bob@student.com', name: 'Bob Student', passwordHash: passwordHashBob, role: Role.USER } });

  const course = await prisma.course.create({ data: { name: 'Math 101', description: 'Intro Math', adminId: courseAdmin.id } });
  const enrollment = await prisma.enrollment.create({ data: { courseId: course.id, studentId: student.id, maxAttendances: 10 } });

  const session = await prisma.checkInSession.create({ data: { courseId: course.id, token: randomUUID(), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });

  console.log('Seeded:');
  console.log({ superAdmin, courseAdmin, student, course, enrollment, session });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });