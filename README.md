# QR Attendance

QR-based attendance tracking for tutoring services with Super Admin, Admin, and User roles.

## Quick Start (Local Dev)

- Requirements: Node 18+, npm
- Backend
  - cd server
  - npm install
  - npm run prisma:generate
  - npm run prisma:migrate
  - npm run seed
  - npm run dev
- Frontend
  - cd client
  - npm install
  - npm run dev

Default accounts:
- Super Admin: admin@root.com / admin123
- Admin: alice@admin.com / password
- User: bob@student.com / password

## One-command Docker Deployment

- Requirements: Docker, Docker Compose
- Copy env example and set secrets:
  - cp .env.example .env
  - set JWT_SECRET and PUBLIC_APP_URL as needed
- Build and run:
  - docker compose up -d --build
- Visit PUBLIC_APP_URL (default http://localhost:3000)

Notes:
- Data persists in a named volume `data` (SQLite file at /data/dev.db)
- The server serves the built React app statically in production
- To reset/seed manually, exec into the container:
  - docker compose exec web sh -lc "node -e 'console.log(`Seeding disabled in production. Use API or custom scripts.`)'"

## Environment Variables

- NODE_ENV: production in Docker
- PORT: 3000
- DATABASE_URL: file:/data/dev.db (container)
- JWT_SECRET: set a strong secret
- PUBLIC_APP_URL: public base URL for QR links

## Security
- Change JWT_SECRET in production
- Prefer HTTPS on PUBLIC_APP_URL so camera access works consistently on mobile
- Rotate QR sessions frequently; default expiry is 30 minutes
