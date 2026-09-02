import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { initDatabase } from './database';
import apiRoutes from './routes';
import { errorHandlerMiddleware } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Security and middleware
app.use(helmet());
app.use(
  cors({
    origin: '*', // Allow Telegram WebApp domain and local frontend during dev
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandlerMiddleware);

// Boot server
async function startServer() {
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`🚀 Máy chủ OẲN TÙ TÌ Backend đang chạy tại http://localhost:${config.port}`);
    console.log(`🎮 Môi trường: ${config.nodeEnv}`);
  });
}

startServer();
