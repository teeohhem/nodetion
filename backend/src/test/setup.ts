import { execSync } from 'child_process';
import { prisma } from '../utils/db';

beforeAll(async () => {
  // Run prisma db push to apply migrations to test.db
  process.env.DATABASE_URL = 'file:./test.db';
  try {
    execSync('npx prisma db push --accept-data-loss --force-reset', {
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'ignore'
    });
  } catch (err) {
    console.error('Failed to sync Prisma test database:', err);
    throw err;
  }
});

afterEach(async () => {
  // Clean tables after each test run to ensure isolation
  try {
    const deletePages = prisma.page.deleteMany();
    const deleteUsers = prisma.user.deleteMany();
    await prisma.$transaction([deletePages, deleteUsers]);
  } catch (err) {
    console.error('Error cleaning up test database tables:', err);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
