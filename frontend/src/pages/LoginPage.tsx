import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { parseError } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const useLoginSchema = () => {
  const { t } = useTranslation('auth')
  return z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(1, t('validation.passwordRequired')),
  })
}

type LoginFormData = {
  email: string
  password: string
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login, syncPreferencesFromServer } = useAuth()
  const loginSchema = useLoginSchema()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (response) => {
      if (response.success && response.data) {
        login(response.data.user, response.data.tokens)
        // Sync preferences (theme) from server after login
        await syncPreferencesFromServer()
        toast.success(t('login.welcomeBack'))
        navigate('/')
      }
    },
    onError: (error) => {
      toast.error(parseError(error))
    },
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('login.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('login.subtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('login.email')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
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

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {t('login.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.passwordPlaceholder')}
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
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          isLoading={loginMutation.isPending}
          rightIcon={!loginMutation.isPending && <ArrowRight className="w-4 h-4" />}
        >
          {loginMutation.isPending ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>

      {/* Sign Up Link */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t('login.noAccount')} </span>
        <Link
          to="/register"
          className="text-primary hover:text-primary-hover font-medium transition-colors"
        >
          {t('login.signUp')}
        </Link>
      </div>
    </div>
  )
}

export default LoginPage
