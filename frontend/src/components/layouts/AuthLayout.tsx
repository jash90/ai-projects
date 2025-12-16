import React from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Bot, FolderOpen, MessageSquare } from 'lucide-react'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { t } = useTranslation('auth')

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding with gradient background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-90" />

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating shapes */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse-soft" style={{ animationDelay: '0.5s' }} />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          <div className="max-w-md text-center space-y-8">
            {/* Logo/Brand */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm shadow-design-lg mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{t('authLayout.brand')}</h1>
              <p className="text-lg text-white/80">
                {t('authLayout.tagline')}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 text-left">
              <FeatureItem
                icon={<Bot className="w-5 h-5" />}
                title={t('authLayout.features.agents.title')}
                description={t('authLayout.features.agents.description')}
              />
              <FeatureItem
                icon={<FolderOpen className="w-5 h-5" />}
                title={t('authLayout.features.projects.title')}
                description={t('authLayout.features.projects.description')}
              />
              <FeatureItem
                icon={<MessageSquare className="w-5 h-5" />}
                title={t('authLayout.features.chat.title')}
                description={t('authLayout.features.chat.description')}
              />
            </div>

            {/* Testimonial or stats */}
            <div className="pt-8 border-t border-white/20">
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">10K+</div>
                  <div className="text-sm text-white/60">{t('authLayout.stats.projects')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm text-white/60">{t('authLayout.stats.models')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-sm text-white/60">{t('authLayout.stats.uptime')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">{t('authLayout.brand')}</span>
            </div>
          </div>

          {/* Language selector */}
          <div className="flex justify-end mb-4">
            <LanguageSelector variant="dropdown" />
          </div>

          {/* Auth form container */}
          <div className="bg-card rounded-2xl border border-border shadow-design-lg p-6 sm:p-8">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              {t('authLayout.footer.agreement')}{' '}
              <a href="#" className="text-primary hover:text-primary-hover underline-offset-4 hover:underline">
                {t('authLayout.footer.terms')}
              </a>{' '}
              {t('authLayout.footer.and')}{' '}
              <a href="#" className="text-primary hover:text-primary-hover underline-offset-4 hover:underline">
                {t('authLayout.footer.privacy')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  </div>
)

export default AuthLayout
