import pino from 'pino';
import { getServerConfig } from 'src/shared/config/env';

const config = getServerConfig();

export const logger = pino({
    level: config.logLevel,
    ...(config.nodeEnv === 'development' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    }),
});
