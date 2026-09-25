import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Lock, Mail, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdminStore } from '../store/adminStore'

// NOTE: Supabase-level rate limiting and captcha must also be enabled
// separately in the Supabase dashboard (Auth -> Settings -> Enable captcha
// protection). The client-side backoff below is UX only and must not be
// relied on as the sole brute-force defense.

const GENERIC_LOGIN_ERROR = 'Invalid credentials. Please try again.'
const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 30

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const adminUser = useAdminStore((state) => state.adminUser)
  const setSession = useAdminStore((state) => state.setSession)
  const setAdminUser = useAdminStore((state) => state.setAdminUser)
  const clearSession = useAdminStore((state) => state.clearSession)

  const [authError, setAuthError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const isLocked = cooldownRemaining > 0

  // Countdown timer for the post-3-failures lockout.
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [cooldownRemaining])

  // Redirect if already logged in as admin
  useEffect(() => {
    if (adminUser) {
      navigate('/', { replace: true })
    }
  }, [adminUser, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleFailedAttempt = () => {
    const next = failedAttempts + 1
    setFailedAttempts(next)
    if (next >= MAX_ATTEMPTS) {
      setCooldownRemaining(LOCKOUT_SECONDS)
    }
  }

  const onSubmit = async (data) => {
    if (isLocked) return
    setAuthError(null)
    setIsSubmitting(true)

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

      if (signInError || !authData?.user) {
        await supabase.auth.signOut().catch(() => {})
        clearSession()
        handleFailedAttempt()
        throw new Error(GENERIC_LOGIN_ERROR)
      }

      const user = authData.user
      const session = authData.session

      // 2. Check admins table to confirm user is an admin (S7: id + email only)
      const { data: adminRecord, error: adminQueryError } = await supabase
        .from('admins')
        .select('id, email')
        .eq('id', user.id)
        .single()

      if (adminQueryError || !adminRecord) {
        // Same generic message: never reveal admin vs non-admin vs unknown.
        await supabase.auth.signOut()
        clearSession()
        handleFailedAttempt()
        throw new Error(GENERIC_LOGIN_ERROR)
      }

      // 3. If found -> save session to Zustand -> redirect to /
      setFailedAttempts(0)
      setSession(session)
      setAdminUser(adminRecord)

      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      // S8 — single generic message for every failure path.
      setAuthError(GENERIC_LOGIN_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-gray-900">
          Mix Originals Admin
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Sign in to access your store dashboard and operations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-xl sm:px-10">
          {authError && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 font-medium">
                {authError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                  }`}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
              {isLocked && (
                <p className="mt-2 text-xs text-red-600 font-medium text-center">
                  Too many attempts. Try again in {cooldownRemaining}s.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
