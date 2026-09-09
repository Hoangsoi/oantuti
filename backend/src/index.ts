import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { isAllowedOrigin } from './config/cors';
import { initDatabase } from './database';
import { startRoomMaintenance } from './services/room.service';
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

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
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

import { startTelegramBot } from './services/bot.service';

// Boot server
async function startServer() {
  validateConfig();
  // Keep deployments resilient when the hosting platform does not run the
  // configured pre-deploy command. initDatabase is idempotent and uses a
  // transaction-scoped advisory lock, so concurrent starts cannot race.
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`🚀 Máy chủ OẲN TÙ TÌ Backend đang chạy tại port ${config.port}`);
    console.log(`🎮 Môi trường: ${config.nodeEnv}`);
    startRoomMaintenance();
    startTelegramBot();
  });
}

startServer().catch(error => { console.error('Startup failed:', error.message); process.exitCode = 1; });
