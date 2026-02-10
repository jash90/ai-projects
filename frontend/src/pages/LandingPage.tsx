import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Bot, 
  Zap, 
  Shield, 
  Smartphone,
  Star,
  Play,
  Github,
  Twitter,
  FileText,
  Sparkles,
  Download,
  Menu,
  X,
  MessageSquare,
  Globe,
  Database,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { usePWAFeatures } from '@/hooks/usePWAFeatures';
import { useAuth } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { canInstall, install, isInstalled } = usePWAFeatures();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Bot,
      title: t('features.items.ai.title'),
      description: t('features.items.ai.description'),
      category: t('features.items.ai.category')
    },
    {
      icon: MessageSquare,
      title: t('features.items.collaboration.title'),
      description: t('features.items.collaboration.description'),
      category: t('features.items.collaboration.category')
    },
    {
      icon: Smartphone,
      title: t('features.items.mobile.title'),
      description: t('features.items.mobile.description'),
      category: t('features.items.mobile.category')
    },
    {
      icon: Shield,
      title: t('features.items.security.title'),
      description: t('features.items.security.description'),
      category: t('features.items.security.category')
    },
    {
      icon: FileText,
      title: t('features.items.management.title'),
      description: t('features.items.management.description'),
      category: t('features.items.management.category')
    },
    {
      icon: Zap,
      title: t('features.items.performance.title'),
      description: t('features.items.performance.description'),
      category: t('features.items.performance.category')
    },
    {
      icon: Database,
      title: t('features.items.analytics.title'),
      description: t('features.items.analytics.description'),
      category: t('features.items.analytics.category')
    },
    {
      icon: Globe,
      title: t('features.items.pwa.title'),
      description: t('features.items.pwa.description'),
      category: t('features.items.pwa.category')
    },
    {
      icon: Settings,
      title: t('features.items.ux.title'),
      description: t('features.items.ux.description'),
      category: t('features.items.ux.category')
    }
  ];

  const testimonials = [
    {
      name: t('testimonials.items.sarah.name'),
      role: t('testimonials.items.sarah.role'),
      avatar: '👩‍💻',
      content: t('testimonials.items.sarah.content')
    },
    {
      name: t('testimonials.items.marcus.name'),
      role: t('testimonials.items.marcus.role'),
      avatar: '👨‍🚀',
      content: t('testimonials.items.marcus.content')
    },
    {
      name: t('testimonials.items.elena.name'),
      role: t('testimonials.items.elena.role'),
      avatar: '👩‍🔬',
      content: t('testimonials.items.elena.content')
    }
  ];

  const stats = [
    { value: '1,000+', label: t('stats.activeDevelopers') },
    { value: '50K+', label: t('stats.projectsBuilt') },
    { value: '99.9%', label: t('stats.uptime') },
    { value: '95%', label: t('stats.rating') }
  ];

  const techStack = [
    { name: 'React 18 + TypeScript', category: t('features.techStack.categories.frontend') },
    { name: 'Node.js + Express', category: t('features.techStack.categories.backend') },
    { name: 'PostgreSQL + Redis', category: t('features.techStack.categories.database') },
    { name: 'OpenAI + Anthropic', category: t('features.techStack.categories.ai') },
    { name: 'Socket.IO + WebRTC', category: t('features.techStack.categories.realtime') },
    { name: 'PWA + Service Workers', category: t('features.techStack.categories.mobile') }
  ];

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleInstallApp = async () => {
    await install();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        isScrolled ? 'bg-background/80 backdrop-blur-lg border-b border-border' : 'bg-transparent'
      )}>
        <div className="container-mobile">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AI Projects</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.features')}
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.testimonials')}
              </a>
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.signIn')}
              </Link>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSelector variant="dropdown" />
              {canInstall && !isInstalled && (
                <Button variant="outline" onClick={handleInstallApp} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  {t('nav.installApp')}
                </Button>
              )}
              <Button onClick={handleGetStarted} className="flex items-center gap-2">
                {t('nav.getStarted')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border">
            <div className="container-mobile py-4">
              <nav className="flex flex-col gap-4">
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.features')}
                </a>
                <a
                  href="#testimonials"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.testimonials')}
                </a>
                <Link
                  to="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.signIn')}
                </Link>
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <div className="py-2">
                    <LanguageSelector variant="dropdown" />
                  </div>
                  {canInstall && !isInstalled && (
                    <Button variant="outline" onClick={handleInstallApp} className="flex items-center gap-2 justify-center">
                      <Download className="w-4 h-4" />
                      {t('nav.installApp')}
                    </Button>
                  )}
                  <Button onClick={handleGetStarted} className="flex items-center gap-2 justify-center">
                    {t('nav.getStarted')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="container-mobile relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {t('hero.badge')}
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              {t('hero.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                {t('hero.titleHighlight')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="w-full sm:w-auto flex items-center gap-2 text-base px-8 py-3 touch-target"
              >
                {t('hero.cta.start')}
                <ArrowRight className="w-5 h-5" />
              </Button>

              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-8 py-3 text-base font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full sm:w-auto touch-target"
              >
                <Play className="w-5 h-5" />
                {t('hero.cta.demo')}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="container-mobile">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-mobile group hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-secondary/50 rounded-full text-muted-foreground">
                    {feature.category}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Tech Stack Preview */}
          <div className="mt-16 pt-16 border-t border-border">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                {t('features.techStack.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.techStack.subtitle')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {techStack.map((tech, index) => (
                <div key={index} className="text-center p-4 bg-card rounded-lg border border-border hover:border-primary/20 transition-colors">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {tech.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tech.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 md:py-24">
        <div className="container-mobile">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card-mobile">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80">
        <div className="container-mobile text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              onClick={handleGetStarted}
              className="w-full sm:w-auto flex items-center gap-2 text-base px-8 py-3 touch-target"
            >
              {t('cta.start')}
              <ArrowRight className="w-5 h-5" />
            </Button>
            {canInstall && !isInstalled && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleInstallApp}
                className="w-full sm:w-auto flex items-center gap-2 text-base px-8 py-3 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 touch-target"
              >
                <Download className="w-5 h-5" />
                {t('cta.installPwa')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/50 border-t border-border">
        <div className="container-mobile">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">AI Projects</span>
              </div>
              <p className="text-muted-foreground">
                {t('footer.tagline')}
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('footer.product.title')}</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.product.features')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.product.api')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.product.documentation')}</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('footer.company.title')}</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.company.about')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.company.blog')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.company.careers')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.company.contact')}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('footer.support.title')}</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.support.helpCenter')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.support.community')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.support.status')}</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.support.privacy')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
