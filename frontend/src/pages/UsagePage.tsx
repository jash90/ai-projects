
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { UsageStats } from '@/components/usage/UsageStats'
import { Button } from '@/components/ui/Button'
import { UserMenu } from '@/components/ui/UserMenu'

export function UsagePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            
            <UserMenu />
          </div>
          
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
