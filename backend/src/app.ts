import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import pageRoutes from './routes/page.routes';

dotenv.config();

const app = express();

app.use(helmet());

const corsOptionsDelegate = (req: any, callback: any) => {
  const origin = req.header('Origin');
  const host = req.header('Host');
  let isAllowed = false;

  if (!origin) {
    isAllowed = true;
  } else {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173'
    ];
    const originHost = origin.replace(/^https?:\/\//, '');
    if (allowedOrigins.includes(origin) || originHost === host) {
      isAllowed = true;
    }
  }

  if (isAllowed) {
    callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    });
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors(corsOptionsDelegate));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/pages', pageRoutes);

// Serve static frontend files in production if built
import fs from 'fs';
import path from 'path';
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]:', err.stack || err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error' 
  });
});

export default app;
