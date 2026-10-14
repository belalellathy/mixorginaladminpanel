import React, { useState, useEffect, useCallback, useRef } from 'react'
import * as z from 'zod'
import {
  Truck,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { fetchShippingRates, updateShippingRate } from '../lib/supabase'

// Mirrors numeric(10,2) + the CHECK constraint: >= 0, <= 100000, 2 decimals.
// NOTE: the raw input string is checked for emptiness BEFORE Number()
// conversion — empty means "not priced" and must never coerce to 0
// (0 = free shipping). This avoids the valueAsNumber NaN/0 pitfall.
const priceSchema = z
  .number({
    required_error: 'Enter a price',
    invalid_type_error: 'Enter a price',
  })
  .min(0, 'Price cannot be negative')
  .max(100000, 'Price cannot exceed 100000')
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
    'Price can have at most 2 decimals'
  )

const formatPrice = (price) => `EGP ${Number(price).toFixed(2)}`

export default function ShippingRates() {
  const [rates, setRates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Inline price edit (one row at a time) + per-row save/toggle flags so one
  // row's save never blocks the others.
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [savingIds, setSavingIds] = useState({})
  const [rowErrors, setRowErrors] = useState({})

  const successTimer = useRef(null)

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccessMessage(''), 3000)
  }

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  const loadRates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchShippingRates()
      setRates(data)
    } catch (err) {
      setError(err.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const startEdit = (rate) => {
    setEditingId(rate.id)
    setEditValue(rate.price === null ? '' : String(rate.price))
    setEditError('')
    setRowErrors((prev) => ({ ...prev, [rate.id]: '' }))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setEditError('')
  }

  const handleSavePrice = async (id) => {
    // Empty input means "not priced" — never coerce it to 0 (0 = free shipping).
    if (editValue.trim() === '') {
      setEditError('Enter a price')
      return
    }
    const parsed = Number(editValue.trim())
    if (Number.isNaN(parsed)) {
      setEditError('Enter a price')
      return
    }
    const result = priceSchema.safeParse(parsed)
    if (!result.success) {
      setEditError(result.error.errors[0]?.message || 'Enter a price')
      return
    }

    setEditError('')
    setSavingIds((prev) => ({ ...prev, [id]: true }))
    try {
      const updated = await updateShippingRate(id, { price: result.data })
      // Not optimistic: merge the new price only after the server confirms.
      setRates((prev) =>
        prev.map((r) => (r.id === id ? { ...r, price: updated.price } : r))
      )
      setEditingId(null)
      setEditValue('')
      showSuccess('Shipping price updated successfully.')
    } catch (err) {
      setEditError(err.message || 'Could not save. Please try again.')
    } finally {
      setSavingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleToggle = async (rate) => {
    // Deactivating is always allowed; activating without a price is blocked
    // by the toggle being disabled (mirrors the DB CHECK constraint).
    if (rate.price === null) return
    const next = !rate.is_active
    setRowErrors((prev) => ({ ...prev, [rate.id]: '' }))
    // Optimistic flip; reverted below if the server rejects.
    setRates((prev) =>
      prev.map((r) => (r.id === rate.id ? { ...r, is_active: next } : r))
    )
    setSavingIds((prev) => ({ ...prev, [rate.id]: true }))
    try {
      const updated = await updateShippingRate(rate.id, { is_active: next })
      setRates((prev) =>
        prev.map((r) =>
          r.id === rate.id ? { ...r, is_active: updated.is_active } : r
        )
      )
      showSuccess(
        next
          ? `${rate.name_en} activated for customers.`
          : `${rate.name_en} deactivated.`
      )
    } catch (err) {
      setRates((prev) =>
        prev.map((r) =>
          r.id === rate.id ? { ...r, is_active: rate.is_active } : r
        )
      )
      setRowErrors((prev) => ({
        ...prev,
        [rate.id]: err.message || 'Could not save. Please try again.',
      }))
    } finally {
      setSavingIds((prev) => ({ ...prev, [rate.id]: false }))
    }
  }

  const activeCount = rates.filter((r) => r.is_active).length
  const unpricedCount = rates.filter((r) => r.price === null).length

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 min-w-0 break-words">
            Shipping
          </h1>
          <p className="text-sm text-gray-500 mt-1 min-w-0 break-words">
            Manage per-governorate delivery prices offered to customers
          </p>
        </div>

        <button
          onClick={loadRates}
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
          <div className="text-sm text-red-700 min-w-0 break-words flex-1">
            <p className="font-semibold">Unable to fetch shipping rates</p>
            <p className="min-w-0 break-words">{error}</p>
            <button
              type="button"
              onClick={loadRates}
              className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-red-300 rounded-md text-xs font-semibold text-red-700 bg-white hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {!isLoading && !error && rates.length > 0 && (
        <p className="text-sm text-gray-500 min-w-0 break-words">
          {activeCount} of {rates.length} active, {unpricedCount} without a
          price
        </p>
      )}

      {/* Shipping Rates Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
        <div className="min-h-[300px] min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Loading shipping rates...
              </p>
            </div>
          ) : rates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Truck className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-gray-900 min-w-0 break-words">
                No shipping rates found
              </p>
              <p className="text-sm text-gray-500 max-w-sm mt-1 min-w-0 break-words">
                Make sure the Supabase shipping_rates table contains records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Governorate
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Arabic Name
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rates.map((rate) => {
                    const isEditing = editingId === rate.id
                    const isSaving = Boolean(savingIds[rate.id])
                    // Disabled until a price exists (mirrors the DB CHECK:
                    // is_active = true requires price IS NOT NULL).
                    const toggleDisabled = rate.price === null || isSaving

                    return (
                      <tr
                        key={rate.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                          {rate.name_en}
                        </td>
                        <td
                          dir="rtl"
                          lang="ar"
                          className="px-6 py-4 text-gray-900 whitespace-nowrap"
                        >
                          {rate.name_ar}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault()
                                handleSavePrice(rate.id)
                              }}
                              className="min-w-0"
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="e.g. 60.00"
                                  autoFocus
                                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                                />
                                <button
                                  type="submit"
                                  disabled={isSaving}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-gray-900 text-white rounded-md text-xs font-semibold hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" />
                                      Save
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={cancelEdit}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {editError && (
                                <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words">
                                  {editError}
                                </p>
                              )}
                            </form>
                          ) : rate.price === null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Not set
                            </span>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {formatPrice(rate.price)}
                              {Number(rate.price) === 0 && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Free
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              rate.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {rate.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isEditing ? (
                            <span className="text-xs text-gray-400">
                              Editing price…
                            </span>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={rate.is_active}
                                aria-label={`${rate.is_active ? 'Deactivate' : 'Activate'} shipping for ${rate.name_en}`}
                                disabled={toggleDisabled}
                                title={
                                  rate.price === null
                                    ? 'Set a price before activating this governorate'
                                    : undefined
                                }
                                onClick={() => handleToggle(rate)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                  rate.is_active
                                    ? 'bg-gray-900'
                                    : 'bg-gray-200'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    rate.is_active
                                      ? 'translate-x-6'
                                      : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => startEdit(rate)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                Edit
                              </button>
                            </div>
                          )}
                          {rowErrors[rate.id] && (
                            <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words text-right">
                              {rowErrors[rate.id]}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 min-w-0 break-words">
        <span className="font-semibold text-gray-700">Note:</span> A price of
        0 means free shipping. Governorates without a price cannot be
        activated. Only active governorates are offered to customers.
      </div>
    </div>
  )
}
