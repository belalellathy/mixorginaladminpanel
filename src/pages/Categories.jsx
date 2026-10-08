import React, { useState, useEffect, useCallback } from 'react'
import {
  Tags,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react'
import { fetchAllCategories, updateCategory, getDisplayError, isValidationError } from '../lib/supabase'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track which category is currently being edited inline
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAccentColor, setEditAccentColor] = useState('#000000')
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAllCategories()
      setCategories(data)
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name || '')
    setEditAccentColor(cat.accent_color || '#000000')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditAccentColor('#000000')
  }

  const handleSaveInline = async (catId) => {
    setError(null)
    setIsSaving(true)
    try {
      const updated = await updateCategory(catId, {
        name: editName.trim(),
        accent_color: editAccentColor.trim() || '#000000',
      })

      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, ...updated } : c))
      )
      setEditingId(null)
      showSuccess(`Category "${updated.name}" updated successfully.`)
    } catch (err) {
      setError(isValidationError(err) ? err.message : getDisplayError(err, 'save'))
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
            Store Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1 min-w-0 break-words">
            Review store departments, edit display titles and theme accent swatches inline
          </p>
        </div>

        <button
          onClick={loadCategories}
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
            <p className="font-semibold">Unable to fetch categories</p>
            <p className="min-w-0 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
        <div className="min-h-[300px] min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Tags className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-gray-900 min-w-0 break-words">No categories found</p>
              <p className="text-sm text-gray-500 max-w-sm mt-1 min-w-0 break-words">
                Make sure the Supabase categories table contains records.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Image</th>
                  <th scope="col" className="px-6 py-3">Category Name</th>
                  <th scope="col" className="px-6 py-3">Slug</th>
                  <th scope="col" className="px-6 py-3">Accent Color</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id
                  const hasImage = !!cat.image_url

                  return (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="px-6 py-4">
                        {hasImage ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Name (Inline editable) */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                            placeholder="Category title"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {cat.name}
                          </span>
                        )}
                      </td>

                      {/* Slug (fixed) */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {cat.slug || '—'}
                      </td>

                      {/* Accent Color Swatch (Inline editable) */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={editAccentColor}
                              onChange={(e) => setEditAccentColor(e.target.value)}
                              className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer bg-white"
                              title="Pick accent color"
                            />
                            <input
                              type="text"
                              value={editAccentColor}
                              onChange={(e) => setEditAccentColor(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md font-mono text-xs uppercase text-gray-800"
                              placeholder="#000000"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2.5">
                            <span
                              className="w-6 h-6 rounded-full border border-gray-300 shadow-inner flex-shrink-0"
                              style={{ backgroundColor: cat.accent_color || '#e5e7eb' }}
                            />
                            <span className="font-mono text-xs text-gray-600 uppercase">
                              {cat.accent_color || 'Default'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveInline(cat.id)}
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
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1 text-gray-500" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
              </div>

              {/* Cards below md (same data source + shared edit state/handlers) */}
              <div className="md:hidden divide-y divide-gray-100 bg-white">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id

                  return (
                    <div key={cat.id} className="p-4 min-w-0">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-0">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md text-base md:text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                            placeholder="Category title"
                            autoFocus
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="color"
                              value={editAccentColor}
                              onChange={(e) => setEditAccentColor(e.target.value)}
                              className="h-11 w-14 flex-shrink-0 p-1 border border-gray-300 rounded-md cursor-pointer bg-white"
                              title="Pick accent color"
                            />
                            <input
                              type="text"
                              value={editAccentColor}
                              onChange={(e) => setEditAccentColor(e.target.value)}
                              className="flex-1 min-w-0 min-h-[44px] px-3 py-2 border border-gray-300 rounded-md font-mono text-base md:text-sm uppercase text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                              placeholder="#000000"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveInline(cat.id)}
                            className="flex w-full items-center justify-center min-h-[44px] px-2.5 py-2 bg-gray-900 text-white rounded-md text-xs font-semibold hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
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
                            className="flex w-full items-center justify-center min-h-[44px] px-2.5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-6 h-6 rounded-full border border-gray-300 shadow-inner flex-shrink-0"
                              style={{ backgroundColor: cat.accent_color || '#e5e7eb' }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {cat.name}
                              </p>
                              <p className="font-mono text-xs text-gray-600 uppercase mt-0.5 min-w-0 break-words">
                                {cat.accent_color || 'Default'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="flex w-full items-center justify-center min-h-[44px] mt-3 px-2.5 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1 text-gray-500" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 min-w-0 break-words">
        <span className="font-semibold text-gray-700">Note:</span> Categories are fixed in accordance with the store's database schema. Adding or deleting categories is disabled; only names and accent colors can be adjusted.
      </div>
    </div>
  )
}
