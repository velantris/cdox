import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { withAuth } from '@workos-inc/authkit-nextjs'
import { ArrowRight, BarChart3, CheckCircle, FileText, Shield, Users, Zap } from "lucide-react"
import Link from "next/link"

export default async function HomePage() {
  const { user } = await withAuth()
  const dashboardHref = user ? '/dashboard' : '/auth/signin'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-gray-900/80 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ClearDoc</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
              Features
            </Link>
            <Link href="#compliance" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
              Compliance
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
              Pricing
            </Link>
            <Link href={dashboardHref} className="text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400 dark:hover:text-blue-300">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href={dashboardHref}>
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            EU Compliance Ready
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Make Legal Documents
            <span className="text-blue-600"> Crystal Clear</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            ClearDoc uses AI to analyze and improve the comprehensibility of banking legal documents, ensuring EU
            compliance while maintaining legal integrity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={dashboardHref}>
              <Button size="lg" className="text-lg px-8">
                Try Demo <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600 dark:text-gray-300">Compliance Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">60%</div>
              <div className="text-gray-600 dark:text-gray-300">Time Saved</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600 dark:text-gray-300">EU Banks</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600 dark:text-gray-300">Documents Analyzed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Comprehensive Document Analysis</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From upload to compliance, ClearDoc provides end-to-end document comprehensibility analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>Comprehensibility Scoring</CardTitle>
                <CardDescription>
                  AI-powered scoring from 0-100 with detailed breakdowns and grade assignments
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <FileText className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>Visual Heatmaps</CardTitle>
                <CardDescription>Section-by-section analysis with color-coded clarity indicators</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Zap className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>Smart Rewrites</CardTitle>
                <CardDescription>
                  AI-suggested improvements that maintain legal meaning while improving clarity
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Users className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>Team Workflows</CardTitle>
                <CardDescription>
                  Assign issues, track progress, and collaborate with legal and compliance teams
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Shield className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>EU Compliance</CardTitle>
                <CardDescription>
                  Built-in GDPR, MiFID II, and PSD2 compliance checking with regulatory guidelines
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-blue-600 mb-4" />
                <CardTitle>Custom Rules</CardTitle>
                <CardDescription>
                  Configure organization-specific rules and patterns for automated flagging
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Built for European Banking Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">GDPR Ready</h3>
                <p className="text-gray-600 dark:text-gray-300">Privacy policy analysis with GDPR compliance checking</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">MiFID II</h3>
                <p className="text-gray-600 dark:text-gray-300">Investment service document clarity requirements</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">PSD2</h3>
                <p className="text-gray-600 dark:text-gray-300">Payment service transparency and disclosure standards</p>
              </div>
            </div>
            <Link href={dashboardHref}>
              <Button size="lg">
                Explore Dashboard <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="text-xl font-bold">ClearDoc</span>
              </div>
              <p className="text-gray-400">Making legal documents comprehensible for European banking.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href={dashboardHref} className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#compliance" className="hover:text-white">
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ClearDoc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
