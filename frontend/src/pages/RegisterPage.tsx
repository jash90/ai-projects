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
import { GoogleIcon, GitHubIcon } from '@/components/icons'
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
          <GoogleIcon size={16} className="mr-2" />
          {t('login.google')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => toast.error(t('login.socialNotConfigured'))}
        >
          <GitHubIcon size={16} className="mr-2" />
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
