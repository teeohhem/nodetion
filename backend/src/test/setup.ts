import { execSync } from 'child_process';
import { prisma } from '../utils/db';

beforeAll(async () => {
  const testDbUrl = process.env.TEST_DATABASE_URL || 'mysql://root@localhost:3306/nodetion_test';
  process.env.DATABASE_URL = testDbUrl;
  try {
    execSync('npx prisma db push --accept-data-loss --force-reset', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
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
