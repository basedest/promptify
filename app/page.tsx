import { redirect } from 'next/navigation';
import { auth } from 'src/shared/backend/auth/auth.server';
import { ChatView } from 'src/pages/chat';

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await (async () => {
            const { headers } = await import('next/headers');
            return headers();
        })(),
    });

    if (!session) {
        redirect('/login');
    }

    return <ChatView />;
}
