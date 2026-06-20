import fs from 'fs';
import path from 'path';

// Force absolute SQLite database URL on startup to prevent different environment cwd resolution issues
// On Hostinger, store the database one level above the git-controlled 'nodejs' folder to prevent data wipes on deploy
const isHostinger = __dirname.includes('domains') && __dirname.includes('nodejs');
const dbDir = isHostinger 
  ? path.resolve(__dirname, '../../../') 
  : path.join(__dirname, '../prisma');
const dbPath = path.join(dbDir, 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

import app from './app';
import { prisma } from './utils/db';

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  // Programmatically execute database migrations via SQL to bypass OS child process limit boundaries (EAGAIN)
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected to database successfully. Checking database schema...');
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    console.log('Database tables already exist. Skipping migration execution.');
  } catch (dbError) {
    console.log('Database tables not found. Deploying migrations programmatically...');
    try {
      const migrationsDir = path.join(__dirname, '../prisma/migrations');
      if (fs.existsSync(migrationsDir)) {
        const folders = fs.readdirSync(migrationsDir)
          .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
          .sort();
        
        for (const folder of folders) {
          const sqlPath = path.join(migrationsDir, folder, 'migration.sql');
          if (fs.existsSync(sqlPath)) {
            console.log(`Executing migration queries from: ${folder}`);
            const sql = fs.readFileSync(sqlPath, 'utf-8');
            const queries = sql
              .split(';')
              .map(q => {
                return q
                  .split('\n')
                  .filter(line => !line.trim().startsWith('--'))
                  .join('\n')
                  .trim();
              })
              .filter(q => q.length > 0);
            
            for (const query of queries) {
              await prisma.$executeRawUnsafe(query);
            }
          }
        }
        console.log('Database migrations completed successfully.');
      } else {
        console.warn('Database migrations folder not found at path:', migrationsDir);
      }
    } catch (migError: any) {
      console.error('Failed to run programmatic migrations:', migError.message || migError);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer();
