"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ConvexErrorBoundaryProps {
  error?: Error | null
  retry?: () => void
  children: React.ReactNode
}

export function ConvexErrorBoundary({ error, retry, children }: ConvexErrorBoundaryProps) {
  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            Connection Error
          </CardTitle>
          <CardDescription>
            Unable to load data from the server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred"}
          </p>
          {retry && (
            <Button onClick={retry} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

interface ConvexLoadingProps {
  message?: string
}

export function ConvexLoading({ message = "Loading..." }: ConvexLoadingProps) {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="flex items-center space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}