'use client';

import { useAuth } from '@workos-inc/authkit-nextjs/components';

export const useUser = () => {
    // Retrieves the user from the session or returns `null` if no user is signed in
    const { user, loading } = useAuth();

    return { user, loading };
}
