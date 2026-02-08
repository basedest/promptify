'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../app/api-routers/app.router';

export const trpc = createTRPCReact<AppRouter>();
