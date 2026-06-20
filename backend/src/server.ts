import { execSync } from 'child_process';
import app from './app';

const PORT = process.env.PORT || 5000;

// Automatically deploy Prisma migrations on startup
import path from 'path';
try {
  console.log('Deploying database migrations...');
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const prismaCliPath = path.join(__dirname, '../node_modules/prisma/build/index.js');
  
  execSync(`node "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`, {
    stdio: 'pipe', // pipe output to capture it on error
    env: process.env
  });
  console.log('Database migrations deployed successfully.');
} catch (error: any) {
  console.error('Failed to deploy migrations:', error.message || error);
  if (error.stdout) {
    console.error('Migration stdout:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('Migration stderr:', error.stderr.toString());
  }
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
