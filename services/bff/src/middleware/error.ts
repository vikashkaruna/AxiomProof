import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../lib/logger.js';

export const errorHandler = () =>
  createMiddleware(async (c, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      const error = err as Error;
      logger.error({ err: error.message, stack: error.stack, path: c.req.path }, 'unhandled error');
      return c.json(
        {
          error: {
            code: 'internal_error',
            message: 'An unexpected error occurred',
            traceId: c.req.header('x-request-id'),
          },
        },
        500,
      );
    }
  });
