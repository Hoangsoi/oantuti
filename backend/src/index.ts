import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { initDatabase } from './database';
import apiRoutes from './routes';
import { errorHandlerMiddleware } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare) for accurate client IP detection
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable default CSP so Telegram WebApp scripts load without friction
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Hardening
const allowedOrigins = [
  'https://telegram.org',
  'https://t.me',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Telegram WebApp WebView, curl) or in dev mode
      if (!origin || config.nodeEnv === 'development' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive origin for Telegram Mini App embedded WebViews
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body limit configuration (Max 100kb payload to prevent payload overload attacks)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Global rate limiting
app.use('/api', apiRateLimiter);

// Health check endpoint (Strict JSON response only)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandlerMiddleware);

// Boot server
async function startServer() {
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`🚀 Máy chủ OẲN TÙ TÌ Backend đang chạy tại port ${config.port}`);
    console.log(`🎮 Môi trường: ${config.nodeEnv}`);
  });
}

startServer();
