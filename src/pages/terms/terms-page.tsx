import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BackButton } from 'src/shared/ui/back-button';

export async function TermsPage() {
    const t = await getTranslations('legal');

    return (
        <div className="mx-auto max-w-3xl px-6 py-12">
            <BackButton label={t('back')} />

            <div className="prose prose-neutral dark:prose-invert mt-8">
                <h1>{t('termsTitle')}</h1>
                <p className="text-muted-foreground text-sm">Effective date: February 22, 2026</p>

                <h2>1. Agreement to Terms</h2>
                <p>
                    By accessing or using YAPP (&quot;the Service&quot;), you agree to be bound by these Terms of
                    Service. If you do not agree to these terms, do not use the Service.
                </p>

                <h2>2. Use of Service</h2>
                <p>
                    YAPP provides an AI-powered conversational assistant. You may use the Service for personal and
                    commercial purposes subject to these Terms. The Service is provided &quot;as is&quot; and we reserve
                    the right to modify or discontinue it at any time.
                </p>

                <h2>3. Account Registration & Eligibility</h2>
                <p>
                    To use the Service, you must create an account with a valid, permanent email address. You must be at
                    least 13 years of age (or the age of digital consent in your country). You are responsible for
                    maintaining the confidentiality of your account credentials and for all activity under your account.
                </p>
                <p>
                    We reserve the right to refuse registration or terminate accounts that use disposable email
                    addresses, provide false information, or violate these Terms.
                </p>

                <h2>4. Acceptable Use Policy</h2>
                <p>You agree not to use the Service to:</p>
                <ul>
                    <li>Generate content that is illegal, harmful, abusive, or violates third-party rights</li>
                    <li>Attempt to circumvent usage limits or access controls</li>
                    <li>Reverse engineer, scrape, or systematically extract data from the Service</li>
                    <li>Use automated tools to interact with the Service beyond the provided API</li>
                    <li>Impersonate any person or entity</li>
                    <li>Spread misinformation or generate deceptive content at scale</li>
                </ul>
                <p>Violation of this policy may result in immediate account termination without notice.</p>

                <h2>5. AI-Generated Content Disclaimer</h2>
                <p>
                    The Service uses third-party AI models (including OpenAI) to generate responses. AI-generated
                    content may be inaccurate, incomplete, or misleading. You are solely responsible for how you use or
                    act upon AI-generated content. We make no warranties about the accuracy, reliability, or fitness of
                    AI responses for any particular purpose.
                </p>

                <h2>6. Intellectual Property</h2>
                <p>
                    You retain ownership of the content you input into the Service. You grant us a limited license to
                    process your inputs solely to provide the Service. We retain all rights to the Service, its
                    codebase, design, and brand.
                </p>

                <h2>7. Termination</h2>
                <p>
                    We may suspend or terminate your account at any time for violation of these Terms, extended
                    inactivity, or at our discretion. You may delete your account at any time through the account
                    settings. Upon termination, your data will be deleted in accordance with our{' '}
                    <Link href="/privacy-policy">Privacy Policy</Link>.
                </p>

                <h2>8. Limitation of Liability</h2>
                <p>
                    To the maximum extent permitted by law, YAPP and its operators shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages arising from your use of the Service. Our
                    total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the
                    claim.
                </p>

                <h2>9. Contact</h2>
                <p>
                    If you have questions about these Terms, please contact us at{' '}
                    <a href="mailto:legal@mail.basedest.tech">legal@mail.basedest.tech</a>.
                </p>
            </div>
        </div>
    );
}
