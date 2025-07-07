import { handleAuth } from '@workos-inc/authkit-nextjs';

// WorkOS will redirect users back to this route after authentication.
// The handler processes the callback, saves the session cookie, then
// redirects the user to the desired page (defaults to '/').
// Adjust `returnPathname` if you want a different landing page post-login.
// You can also provide onSuccess/onError hooks here as needed.
export const GET = handleAuth({ returnPathname: '/dashboard' }); 