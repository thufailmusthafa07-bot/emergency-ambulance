import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration - Allow local frontend development origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev mode
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP' },
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (No Database Required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'NALAM NAGAR Emergency Dispatch & Optimization Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    databaseRequired: false,
  });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler as any);

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚑 NALAM NAGAR Backend API Server Running!`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`💚 Health Check: http://localhost:${env.PORT}/health`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Database: PostgreSQL via Prisma`);
  console.log(`====================================================`);
});

export default app;
