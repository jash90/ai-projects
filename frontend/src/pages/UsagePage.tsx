import { useTranslation } from 'react-i18next'
import { UsageStats } from '@/components/usage/UsageStats'
import { PageHeader } from '@/components/ui/PageHeader'

export function UsagePage() {
  const { t } = useTranslation('dashboard')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader
        title={t('usagePage.title')}
        subtitle={t('usagePage.subtitle')}
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
