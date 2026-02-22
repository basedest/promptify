import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';
import { createTranslator } from 'next-intl';

/**
 * Colors from app globals.css .dark theme (oklch → zinc hex equivalents).
 * background: oklch(0.145 0 0) → zinc-950
 * card:       oklch(0.205 0 0) → zinc-900
 * foreground: oklch(0.985 0 0) → zinc-50
 * muted-fg:   oklch(0.708 0 0) → zinc-400
 * primary:    oklch(0.922 0 0) → zinc-100
 * primary-fg: oklch(0.205 0 0) → zinc-900
 * border:     oklch(1 0 0/10%) → white 10% on zinc-950 ≈ zinc-800
 */
const theme = {
    background: '#09090b',
    card: '#18181b',
    foreground: '#fafafa',
    mutedForeground: '#a1a1aa',
    primary: '#f4f4f5',
    primaryForeground: '#18181b',
    border: '#27272a',
    radiusMd: '6px',
};

type VerificationEmailProps = {
    url: string;
    locale?: string;
};

export default async function VerificationEmail({ url, locale = 'en' }: VerificationEmailProps) {
    const messages = await import(`../lib/locales/${locale}.json`);
    const t = createTranslator({ messages, namespace: 'email.verifyEmail', locale });

    return (
        <Html>
            <Head>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');`}</style>
            </Head>
            <Preview>{t('preview')}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={logoSection}>
                        <Text style={logoText}>YAPP</Text>
                    </Section>
                    <Heading style={heading}>{t('heading')}</Heading>
                    <Text style={paragraph}>{t('body')}</Text>
                    <Section style={buttonSection}>
                        <Button style={button} href={url}>
                            {t('button')}
                        </Button>
                    </Section>
                    <Text style={paragraphSmall}>
                        {t('fallback')}{' '}
                        <Link href={url} style={link}>
                            {url}
                        </Link>
                    </Text>
                    <Hr style={hr} />
                    <Text style={footer}>{t('footer')}</Text>
                </Container>
            </Body>
        </Html>
    );
}

VerificationEmail.PreviewProps = {
    url: 'https://yapp.basedest.tech/api/auth/verify-email?token=example-token&callbackURL=%2Fchat',
    locale: 'en',
} as VerificationEmailProps;

const main = {
    backgroundColor: theme.background,
    color: theme.foreground,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
    backgroundColor: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusMd,
    margin: '40px auto',
    maxWidth: '465px',
    padding: '32px 28px',
};

const logoSection = {
    marginBottom: '28px',
    textAlign: 'center' as const,
};

const logoText = {
    fontFamily: '"Righteous", sans-serif',
    fontSize: '18px',
    fontWeight: '800',
    color: theme.foreground,
    letterSpacing: '0.05em',
    textShadow: `0 0 6px ${theme.foreground}`,
    margin: '0',
};

const heading = {
    fontSize: '22px',
    fontWeight: '600',
    color: theme.foreground,
    margin: '0 0 12px',
    padding: '0',
    textAlign: 'center' as const,
};

const paragraph = {
    fontSize: '14px',
    lineHeight: '1.625',
    color: theme.foreground,
    margin: '0 0 24px',
    textAlign: 'center' as const,
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '0 0 24px',
};

const button = {
    backgroundColor: theme.primary,
    color: theme.primaryForeground,
    borderRadius: theme.radiusMd,
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '10px 24px',
};

const paragraphSmall = {
    fontSize: '12px',
    lineHeight: '1.5',
    color: theme.mutedForeground,
    margin: '0',
    wordBreak: 'break-all' as const,
};

const link = {
    color: theme.primary,
    textDecoration: 'underline',
};

const hr = {
    borderColor: theme.border,
    margin: '24px 0',
};

const footer = {
    fontSize: '12px',
    lineHeight: '1.5',
    color: theme.mutedForeground,
    margin: '0',
};
