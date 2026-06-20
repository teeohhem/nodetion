import { execSync } from 'child_process';
import app from './app';

const PORT = process.env.PORT || 5000;

// Automatically deploy Prisma migrations on startup
try {
  console.log('Deploying database migrations...');
  execSync('npx prisma migrate deploy --schema=./backend/prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('Database migrations deployed successfully.');
} catch (error) {
  console.error('Failed to deploy migrations:', error);
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
