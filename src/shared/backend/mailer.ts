import 'server-only';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/backend/logger';
import { createMailer, type Mailer } from '@basedest/mailer';

let mailerInstance: Mailer | null = null;

/**
 * App-level singleton. Wires mailer with app config and logger.
 */
export function getMailer(): Mailer {
    if (mailerInstance) return mailerInstance;

    const { mailer: mailerConfig } = getServerConfig();
    mailerInstance = createMailer(mailerConfig, {
        logger: {
            log: (opts) => logger.info(opts, opts.message),
        },
    });

    return mailerInstance;
}
