import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Mail, Lock, User, Check, X, ArrowRight } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { parseError } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const useRegisterSchema = () => {
  const { t } = useTranslation('auth')
  return z.object({
    email: z.string().email(t('validation.invalidEmail')),
    username: z.string()
      .min(3, t('validation.usernameMin'))
      .max(30, t('validation.usernameMax'))
      .regex(/^[a-zA-Z0-9_]+$/, t('validation.usernameFormat')),
    password: z.string()
      .min(6, t('validation.passwordMin')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordsNoMatch'),
    path: ["confirmPassword"],
  })
}

type RegisterFormData = {
  email: string
  username: string
  password: string
  confirmPassword: string
}

// Password strength indicator component
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const { t } = useTranslation('auth')

  const strength = useMemo(() => {
    let score = 0
    const checks = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    }

    Object.values(checks).forEach((passed) => {
      if (passed) score++
    })

    return { score, checks }
  }, [password])

  const getStrengthLabel = () => {
    if (strength.score <= 1) return { label: t('password.weak'), color: 'bg-destructive' }
    if (strength.score <= 2) return { label: t('password.fair'), color: 'bg-warning' }
    if (strength.score <= 3) return { label: t('password.good'), color: 'bg-info' }
    return { label: t('password.strong'), color: 'bg-success' }
  }

  const strengthInfo = getStrengthLabel()

  if (!password) return null

  return (
    <div className="space-y-2 animate-fade-in">
      {/* Strength Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              level <= strength.score ? strengthInfo.color : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t('password.strength')}</span>
        <span className={`font-medium ${
          strength.score <= 1 ? 'text-destructive' :
          strength.score <= 2 ? 'text-warning' :
          strength.score <= 3 ? 'text-info' : 'text-success'
        }`}>
          {strengthInfo.label}
        </span>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <RequirementItem met={strength.checks.length} label={t('password.requirements.length')} />
        <RequirementItem met={strength.checks.lowercase} label={t('password.requirements.lowercase')} />
        <RequirementItem met={strength.checks.uppercase} label={t('password.requirements.uppercase')} />
        <RequirementItem met={strength.checks.number} label={t('password.requirements.number')} />
        <RequirementItem met={strength.checks.special} label={t('password.requirements.special')} />
      </div>
    </div>
  )
}

const RequirementItem: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <div className={`flex items-center gap-1 transition-colors ${met ? 'text-success' : 'text-muted-foreground'}`}>
    {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    <span>{label}</span>
  </div>
)

const RegisterPage: React.FC = () => {
  const { t } = useTranslation('auth')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { login, syncPreferencesFromServer } = useAuth()
  const registerSchema = useRegisterSchema()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = useWatch({ control, name: 'password', defaultValue: '' })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (response) => {
      if (response.success && response.data) {
        login(response.data.user, response.data.tokens)
        // Sync preferences (theme) from server after registration
        await syncPreferencesFromServer()
        toast.success(t('register.accountCreated'))
        navigate('/')
      }
    },
    onError: (error) => {
      toast.error(parseError(error))
    },
  })

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data
    registerMutation.mutate(registerData)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('register.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('register.subtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('register.email')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              className={`
                w-full h-10 pl-10 pr-4 rounded-lg text-sm
                bg-background border transition-all duration-200
                placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary
                disabled:cursor-not-allowed disabled:opacity-50
                ${errors.email
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-input hover:border-muted-foreground/30'
                }
              `}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
              <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            {t('register.username')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="w-4 h-4" />
            </div>
            <input
              id="username"
              type="text"
              placeholder={t('register.usernamePlaceholder')}
              className={`
                w-full h-10 pl-10 pr-4 rounded-lg text-sm
                bg-background border transition-all duration-200
                placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary
                disabled:cursor-not-allowed disabled:opacity-50
                ${errors.username
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-input hover:border-muted-foreground/30'
                }
              `}
              {...register('username')}
            />
          </div>
          {errors.username && (
            <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
              <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t('register.password')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('register.passwordPlaceholder')}
              className={`
                w-full h-10 pl-10 pr-10 rounded-lg text-sm
                bg-background border transition-all duration-200
                placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary
                disabled:cursor-not-allowed disabled:opacity-50
                ${errors.password
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-input hover:border-muted-foreground/30'
                }
              `}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
              <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
              {errors.password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator password={password} />
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            {t('register.confirmPassword')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('register.confirmPasswordPlaceholder')}
              className={`
                w-full h-10 pl-10 pr-10 rounded-lg text-sm
                bg-background border transition-all duration-200
                placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary
                disabled:cursor-not-allowed disabled:opacity-50
                ${errors.confirmPassword
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-input hover:border-muted-foreground/30'
                }
              `}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
              <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          isLoading={registerMutation.isPending}
          rightIcon={!registerMutation.isPending && <ArrowRight className="w-4 h-4" />}
        >
          {registerMutation.isPending ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t('register.divider')}</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => toast.error(t('login.socialNotConfigured'))}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('login.google')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => toast.error(t('login.socialNotConfigured'))}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          {t('login.github')}
        </Button>
      </div>

      {/* Sign In Link */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t('register.hasAccount')} </span>
        <Link
          to="/login"
          className="text-primary hover:text-primary-hover font-medium transition-colors"
        >
          {t('register.signIn')}
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
