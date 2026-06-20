import app from './app';
import { prisma } from './utils/db';

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer();
