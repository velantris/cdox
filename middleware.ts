import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// Initialize the WorkOS AuthKit middleware.
// See https://docs.workos.com for configuration options.
export default authkitMiddleware({
    // Ensure WorkOS receives the correct redirect URI matching your dashboard config
    redirectUri: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
});

// Only run the middleware on routes that should require authentication.
// Adjust the matcher array as your app grows.
export const config = {
    matcher: ['/', '/dashboard/:path*', '/auth/:path*'],
}; 