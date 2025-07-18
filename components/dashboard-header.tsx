"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

import { FileText, Upload } from "lucide-react"

interface DashboardHeaderProps {
    /** Additional elements to render on the right side of the header (after the default actions) */
    actions?: React.ReactNode
}

export function DashboardHeader({ actions }: DashboardHeaderProps) {
    const pathname = usePathname()

    const navItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/documents", label: "Documents" },
        { href: "/dashboard/teams", label: "Teams" },
        { href: "/dashboard/settings", label: "Settings" },
    ]

    const linkClass = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`)
            ? "text-primary font-medium"
            : "text-muted-foreground hover:text-foreground"

    return (
        <header className="bg-background border-b border-border">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold text-foreground">CDox AI</span>
                        </Link>
                        <nav className="hidden md:flex items-center space-x-6">
                            {navItems.map(({ href, label }) => (
                                <Link key={href} href={href} className={linkClass(href)}>
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        <SignOutButton />
                        <Link href="/dashboard/doc-new">
                            <Button>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Document
                            </Button>
                        </Link>
                        {actions}
                    </div>
                </div>
            </div>
        </header>
    )
} 