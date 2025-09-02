import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Bot, 
  Zap, 
  Shield, 
  Smartphone,
  Star,
  Play,
  CheckCircle,
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
import { usePWAFeatures } from '@/hooks/usePWAFeatures';
import { useAuth } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function LandingPage() {
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
      title: 'Advanced AI Integration',
      description: 'Dynamic model management with OpenAI GPT and Anthropic Claude models. Specialized AI agents with unique personalities and capabilities.',
      category: 'AI'
    },
    {
      icon: MessageSquare,
      title: 'Real-time Chat & Collaboration',
      description: 'WebSocket-powered conversations with typing indicators, streaming responses, and persistent chat history.',
      category: 'Collaboration'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First PWA',
      description: 'Progressive Web App with offline support, native app installation, touch-optimized interface, and mobile navigation.',
      category: 'Mobile'
    },
    {
      icon: Shield,
      title: 'Enterprise Security & Admin',
      description: 'Role-based access control, admin panel, user management, token limits, activity logging, and comprehensive security.',
      category: 'Security'
    },
    {
      icon: FileText,
      title: 'Advanced Project Management',
      description: 'Multi-project support, file management (20+ types), project-specific agents, and real-time file collaboration.',
      category: 'Management'
    },
    {
      icon: Zap,
      title: 'High Performance Architecture',
      description: 'PostgreSQL with Redis caching, connection pooling, code splitting, service workers, and mobile optimization.',
      category: 'Performance'
    },
    {
      icon: Database,
      title: 'Token Usage Tracking',
      description: 'Comprehensive monitoring of AI API usage, costs per project, admin-configurable limits, and usage analytics.',
      category: 'Analytics'
    },
    {
      icon: Globe,
      title: 'Offline Capabilities',
      description: 'Service worker with intelligent caching, background sync, offline file access, and queue management.',
      category: 'PWA'
    },
    {
      icon: Settings,
      title: 'User Settings & Preferences',
      description: 'Comprehensive settings for profile, security, preferences, dark/light mode, and personal usage statistics.',
      category: 'User Experience'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Full-stack Developer',
      avatar: '👩‍💻',
      content: 'The mobile-first PWA design is incredible. I can code on my phone during commutes and seamlessly continue on desktop. The offline capabilities are a game-changer.'
    },
    {
      name: 'Marcus Johnson',
      role: 'Engineering Manager',
      avatar: '👨‍🚀',
      content: 'The admin panel gives us complete control over our team\'s AI usage. Token tracking and user management features have saved us thousands in API costs.'
    },
    {
      name: 'Elena Rodriguez',
      role: 'DevOps Engineer',
      avatar: '👩‍🔬',
      content: 'Real-time collaboration with WebSocket integration is seamless. The service worker and caching strategies make this the fastest development platform I\'ve used.'
    }
  ];

  const stats = [
    { value: '15K+', label: 'Active Developers' },
    { value: '75K+', label: 'AI Projects Built' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '4.8/5', label: 'PWA Store Rating' }
  ];

  const techStack = [
    { name: 'React 18 + TypeScript', category: 'Frontend' },
    { name: 'Node.js + Express', category: 'Backend' },
    { name: 'PostgreSQL + Redis', category: 'Database' },
    { name: 'OpenAI + Anthropic', category: 'AI' },
    { name: 'Socket.IO + WebRTC', category: 'Real-time' },
    { name: 'PWA + Service Workers', category: 'Mobile' }
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
                Features
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Testimonials
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {canInstall && !isInstalled && (
                <Button variant="outline" onClick={handleInstallApp} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              )}
              <Button onClick={handleGetStarted} className="flex items-center gap-2">
                Get Started
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
                  Features
                </a>
                <a 
                  href="#testimonials" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </a>
                <a 
                  href="#pricing" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <Link 
                  to="/login" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  {canInstall && !isInstalled && (
                    <Button variant="outline" onClick={handleInstallApp} className="flex items-center gap-2 justify-center">
                      <Download className="w-4 h-4" />
                      Install App
                    </Button>
                  )}
                  <Button onClick={handleGetStarted} className="flex items-center gap-2 justify-center">
                    Get Started
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
              Production-Ready AI Development Platform
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              The Future of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                AI-Powered Development
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Full-stack platform with advanced AI agents, real-time collaboration, mobile-first PWA design, 
              enterprise security, and comprehensive project management. Work anywhere, anytime.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="w-full sm:w-auto flex items-center gap-2 text-base px-8 py-3 touch-target"
              >
                Start Building Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-8 py-3 text-base font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full sm:w-auto touch-target"
              >
                <Play className="w-5 h-5" />
                Watch Demo
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
              Production-Ready Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade platform with advanced AI integration, mobile-first design, 
              and comprehensive development tools built for modern teams.
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
                Built with Modern Technologies
              </h3>
              <p className="text-muted-foreground">
                Production-ready stack with TypeScript, React 18, Node.js, PostgreSQL, and AI integration
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
              Loved by developers worldwide
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our community of developers has to say about AI Projects.
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

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container-mobile">
                  <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Enterprise-grade pricing for teams of all sizes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Full-featured platform with AI integration, mobile PWA, admin controls, and enterprise security. 
            Start free, scale as you grow.
          </p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card-mobile">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Starter</h3>
                <div className="text-3xl font-bold text-foreground mb-1">$0</div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">5 AI projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">OpenAI GPT models</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Mobile PWA access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Offline capabilities</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Community support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={handleGetStarted}>
                Get Started Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="card-mobile border-primary relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Professional</h3>
                <div className="text-3xl font-bold text-foreground mb-1">$29</div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Unlimited projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">GPT-4 + Claude models</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Real-time collaboration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Advanced file management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Usage analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Priority support</span>
                </li>
              </ul>
              <Button className="w-full" onClick={handleGetStarted}>
                Start Pro Trial
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="card-mobile">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-foreground mb-1">Custom</div>
                <div className="text-muted-foreground">contact us</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Admin panel & RBAC</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Custom token limits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Activity logging</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">SSO & compliance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Dedicated support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80">
        <div className="container-mobile text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to revolutionize your development experience?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of developers building the future with AI-powered development, 
            mobile-first design, and enterprise-grade security.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleGetStarted}
              className="w-full sm:w-auto flex items-center gap-2 text-base px-8 py-3 touch-target"
            >
              Start Building Today
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
                Install PWA
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
                The future of development is here. Build amazing projects with AI assistance.
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
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Community</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Status</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2024 AI Projects. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
