import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Save,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { supabase, getDisplayError } from '../lib/supabase'

const FIELDS = [
  { key: 'payment_instapay', label: 'Instapay number / phone', placeholder: 'e.g. 01xxxxxxxxx', inputMode: 'tel', autoComplete: 'off', spellCheck: false },
  { key: 'payment_bank_name', label: 'Bank name', placeholder: 'e.g. Banque Misr', autoComplete: 'off', spellCheck: false },
  { key: 'payment_account_name', label: 'Account holder name', placeholder: 'e.g. John Doe', autoComplete: 'off', spellCheck: false },
  { key: 'payment_iban', label: 'IBAN', placeholder: 'e.g. EGxx xxxx xxxx xxxx xxxx xxxx', autoComplete: 'off', spellCheck: false },
]

const EMPTY_VALUES = {
  payment_instapay: '',
  payment_bank_name: '',
  payment_account_name: '',
  payment_iban: '',
}

export default function PaymentSettings() {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value')

      if (error) throw error

      const next = { ...EMPTY_VALUES }
      ;(data || []).forEach((row) => {
        if (row.key in next) {
          next[row.key] = row.value ?? ''
        }
      })
      setValues(next)
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleChange = (key, newValue) => {
    setValues((prev) => ({ ...prev, [key]: newValue }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage('')
    setIsSaving(true)
    try {
      for (const { key } of FIELDS) {
        const newValue = values[key] ?? ''
        const { error } = await supabase
          .from('store_settings')
          .update({ value: newValue, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }
      showSuccess('Payment settings saved successfully.')
    } catch (err) {
      setError(getDisplayError(err, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 min-w-0 break-words">
            Payment Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1 min-w-0 break-words">
            Manage bank transfer and Instapay details shown to customers at checkout
          </p>
        </div>

        <button
          type="button"
          onClick={loadSettings}
          className="flex items-center justify-center space-x-2 px-3 py-2 min-h-[44px] md:min-h-0 w-full md:w-auto text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-3 border border-green-200 flex items-center space-x-2 text-sm text-green-800 font-medium min-w-0">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="min-w-0 break-words">{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start space-x-3 min-w-0">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 min-w-0 break-words">
            <p className="font-semibold">Something went wrong</p>
            <p className="min-w-0 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-700 flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 min-w-0 break-words">
              Bank & Instapay Details
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 min-w-0 break-words">
              These values are read from the store_settings table
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-500">Loading payment settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 min-w-0">
            {FIELDS.map((field) => (
              <div key={field.key} className="min-w-0">
                <label
                  htmlFor={field.key}
                  className="block text-sm font-medium text-gray-700 mb-1.5 min-w-0 break-words"
                >
                  {field.label}
                </label>
                <input
                  id={field.key}
                  type="text"
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  inputMode={field.inputMode}
                  autoComplete={field.autoComplete}
                  spellCheck={field.spellCheck}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base md:text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            ))}

            <div className="pt-2 min-w-0">
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full md:w-auto items-center justify-center min-h-[44px] md:min-h-0 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
