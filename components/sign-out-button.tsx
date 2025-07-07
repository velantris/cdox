"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
    children?: React.ReactNode;
    className?: string;
    returnTo?: string; // optional return URL
}

export function SignOutButton({ children = "Sign out", className, returnTo }: SignOutButtonProps) {
    const { signOut, loading } = useAuth();

    const handleClick = async () => {
        await signOut(returnTo ? { returnTo } : undefined);
    };

    return (
        <Button variant="outline" className={className} onClick={handleClick} disabled={loading}>
            <LogOut className="w-4 h-4 mr-2" />
            {children}
        </Button>
    );
} 