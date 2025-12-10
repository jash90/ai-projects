import { UsageStats } from '@/components/usage/UsageStats'
import { PageHeader } from '@/components/ui/PageHeader'

export function UsagePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader
        title="API Usage & Statistics"
        subtitle="Monitor your token usage and costs across different AI providers"
        showBackButton
        backTo="/dashboard"
        variant="gradient"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <UsageStats />
      </main>
    </div>
  )
}
