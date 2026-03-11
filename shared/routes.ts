import { z } from 'zod';
import { insertPlayHistorySchema, playHistory } from './schema';

export const api = {
  history: {
    list: {
      method: 'GET' as const,
      path: '/api/history' as const,
      responses: {
        200: z.array(z.custom<typeof playHistory.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/history' as const,
      input: insertPlayHistorySchema,
      responses: {
        201: z.custom<typeof playHistory.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
