import { getTranslations } from 'next-intl/server';
import { BackButton } from 'src/shared/ui/back-button';

export async function PrivacyPolicyPage() {
    const t = await getTranslations('legal');

    return (
        <div className="mx-auto max-w-3xl px-6 py-12">
            <BackButton label={t('back')} />

            <div className="prose prose-neutral dark:prose-invert mt-8">
                <h1>{t('privacyPolicyTitle')}</h1>
                <p className="text-muted-foreground text-sm">Effective date: February 22, 2026</p>

                <h2>1. Introduction</h2>
                <p>
                    Welcome to YAPP (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). This Privacy Policy explains
                    how we collect, use, and protect information about you when you use our service. By using YAPP, you
                    agree to the collection and use of information in accordance with this policy.
                </p>

                <h2>2. Information We Collect</h2>
                <h3>Account Data</h3>
                <p>
                    When you register, we collect your email address and, if you sign in with Google, your name and
                    profile picture. We store this information to identify your account and provide the service.
                </p>
                <h3>Usage Data</h3>
                <p>
                    We collect information about how you use the service, including conversations you create, messages
                    you send to the AI assistant, and token usage. This data is associated with your account.
                </p>
                <h3>Cookies & Sessions</h3>
                <p>
                    We use session cookies to keep you signed in. We do not use tracking cookies or third-party
                    advertising cookies.
                </p>

                <h2>3. How We Use Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                    <li>Provide and maintain the service</li>
                    <li>Process your AI conversation requests</li>
                    <li>Send account-related emails (verification, security notices)</li>
                    <li>Enforce usage limits and prevent abuse</li>
                    <li>Improve the service</li>
                </ul>
                <p>
                    We do not sell your personal data to third parties. We do not use your conversation content to train
                    AI models.
                </p>

                <h2>4. Data Storage & Security</h2>
                <p>
                    Your data is stored in a PostgreSQL database hosted on our infrastructure. We use industry-standard
                    security practices including encrypted connections (HTTPS/TLS) and hashed passwords. No method of
                    transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>

                <h2>5. Third-Party Services</h2>
                <p>We use the following third-party services that may process your data:</p>
                <ul>
                    <li>
                        <strong>Google OAuth</strong> — if you choose to sign in with Google, Google processes your
                        authentication. See{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                            Google&apos;s Privacy Policy
                        </a>
                        .
                    </li>
                    <li>
                        <strong>OpenAI API</strong> — your messages are sent to OpenAI to generate AI responses. See{' '}
                        <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">
                            OpenAI&apos;s Privacy Policy
                        </a>
                        .
                    </li>
                </ul>

                <h2>6. Your Rights & Data Deletion</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access the personal data we hold about you</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Export your conversation data</li>
                </ul>
                <p>
                    To exercise these rights, contact us at the email below. Account deletion requests will be processed
                    within 30 days.
                </p>

                <h2>7. Contact</h2>
                <p>
                    If you have questions about this Privacy Policy, please contact us at{' '}
                    <a href="mailto:privacy@mail.basedest.tech">privacy@mail.basedest.tech</a>.
                </p>
            </div>
        </div>
    );
}
