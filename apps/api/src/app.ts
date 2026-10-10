import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { MulterError } from 'multer';
import { pinoHttp } from 'pino-http';

import type { ApiErrorBody, HealthDTO } from '@civiccircle/shared';
import { LIMITS } from '@civiccircle/shared';

import type { AppDeps } from './deps';
import { HttpError } from './errors';
import { authenticate } from './middleware/auth';
import { createRateLimiters } from './middleware/rateLimit';
import { accountRoutes } from './routes/account';
import { reportRoutes } from './routes/reports';

export function createApp(deps: AppDeps) {
  const { config, logger } = deps;
  const app = express();
  const startedAt = Date.now();
  const limits = createRateLimiters(config.rateLimits);

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );
  if (config.env !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/health' },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      }),
    );
  }

  app.get('/health', (_req, res) => {
    const body: HealthDTO = {
      ok: true,
      version: deps.version,
      aiProvider: deps.ai.providerName,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    };
    res.json(body);
  });

  app.use(limits.global);
  app.use(express.json({ limit: '32kb' }));
  app.use(authenticate(deps.auth, deps.store));
  app.use('/v1', accountRoutes(deps, limits));
  app.use('/v1/reports', reportRoutes(deps, limits));

  app.use((_req, res) => {
    const body: ApiErrorBody = { error: { code: 'not_found', message: 'Route not found' } };
    res.status(404).json(body);
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    let status = 500;
    let body: ApiErrorBody = {
      error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' },
    };
    if (err instanceof HttpError) {
      status = err.status;
      body = { error: { code: err.code, message: err.message, details: err.details } };
    } else if (err instanceof MulterError) {
      status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Photo is too large (max ${LIMITS.photoMaxBytes / 1024 / 1024} MB)`
          : 'Upload one photo in the "photo" field';
      body = { error: { code: 'invalid_upload', message } };
    } else if (isBodyParserError(err)) {
      status = err.status;
      body = { error: { code: 'bad_request', message: 'Request body is not valid JSON' } };
    } else {
      (req.log ?? logger).error({ err }, 'unhandled error');
    }
    res.status(status).json(body);
  });

  return app;
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}
