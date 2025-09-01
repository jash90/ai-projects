import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { UsageStats } from '@/components/usage/UsageStats'
import { Button } from '@/components/ui/Button'

export function UsagePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-foreground">
            API Usage & Statistics
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your token usage and costs across different AI providers
          </p>
        </div>

        {/* Usage Statistics Component */}
        <UsageStats />
      </div>
    </div>
  )
}
