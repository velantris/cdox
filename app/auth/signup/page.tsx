import { Button } from '@/components/ui/button';
import { getSignInUrl, getSignUpUrl, withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
    const { user } = await withAuth();
    if (user) {
        redirect('/dashboard');
    }

    const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    const signUpUrl = await getSignUpUrl({ redirectUri });
    const signInUrl = await getSignInUrl({ redirectUri });

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Create your ClearDoc account</h1>
            <div className="flex flex-col sm:flex-row gap-4">
                <Link href={signUpUrl}>
                    <Button size="lg">Continue with WorkOS</Button>
                </Link>
                <Link href={signInUrl}>
                    <Button size="lg" variant="outline" className="bg-transparent">
                        Sign in instead
                    </Button>
                </Link>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-primary underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
} 