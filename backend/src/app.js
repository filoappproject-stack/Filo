import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import checkinsRoutes from './routes/checkins.routes.js';
import healthRoutes from './routes/health.routes.js';
import tasksRoutes from './routes/tasks.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({
    name: 'Filo API',
    version: '0.1.0',
    docs: '/api/v1/health'
  });
});

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/checkins', checkinsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
