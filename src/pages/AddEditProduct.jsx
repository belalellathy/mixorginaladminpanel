import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react'
import {
  fetchProductById,
  insertProduct,
  updateProduct,
  fetchAllCategories,
  getDisplayError,
} from '../lib/supabase'
import ProductImageUpload from '../components/ProductImageUpload'

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0.01, 'Price must be greater than 0'),
  stock: z
    .number({ invalid_type_error: 'Stock must be an integer' })
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative'),
  category_id: z.string().min(1, 'Please select a category'),
  image_url: z.string().optional().nullable(),
  is_featured: z.boolean().default(false),
})

export default function AddEditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: 0,
      category_id: '',
      image_url: '',
      is_featured: false,
    },
  })

  // Load initial categories & product data if edit mode
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch categories
      const categoriesData = await fetchAllCategories()
      setCategories(categoriesData)

      // 2. If editing, fetch product
      if (isEditMode) {
        setIsLoading(true)
        const product = await fetchProductById(id)
        if (product) {
          reset({
            name: product.name || '',
            description: product.description || '',
            price: Number(product.price) || 0,
            stock: Number(product.stock) || 0,
            category_id: product.category_id || '',
            image_url: product.image_url || '',
            is_featured: Boolean(product.is_featured),
          })
        }
      }
    } catch (err) {
      setFormError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [id, isEditMode, reset])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onSubmit = async (formData) => {
    setFormError(null)
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category_id: formData.category_id,
        image_url: formData.image_url || null,
        is_featured: Boolean(formData.is_featured),
      }

      if (isEditMode) {
        await updateProduct(id, payload)
      } else {
        await insertProduct(payload)
      }

      navigate('/products')
    } catch (err) {
      setFormError(getDisplayError(err, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading product form...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0">
      {/* Header */}
      <div className="min-w-0">
        <Link
          to="/products"
          className="inline-flex items-center min-h-[44px] md:min-h-0 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 uppercase tracking-wider mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 flex-shrink-0" /> Back to Products
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 min-w-0 break-words">
          {isEditMode ? 'Edit Product' : 'Add New Product'}
        </h1>
        <p className="text-sm text-gray-500 mt-1 min-w-0 break-words">
          {isEditMode
            ? 'Update product pricing, stock availability, category, and images'
            : 'Fill in details to list a new beauty product in your online catalog'}
        </p>
      </div>

      {formError && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start space-x-3 min-w-0">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 min-w-0 break-words">
            <p className="font-semibold">Unable to save product</p>
            <p className="min-w-0 break-words">{formError}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 min-w-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-w-0">
          {/* Product Name */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700">
              Product Title *
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Hydrating Hyaluronic Serum 30ml"
              className={`mt-1 block w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={4}
              {...register('description')}
              placeholder="Provide ingredients, key benefits, usage instructions..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-base md:text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {/* 3 Column Grid: Category, Price, Stock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
            {/* Category Dropdown */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                {...register('category_id')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-1 ${
                  errors.category_id
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                }`}
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words">
                  {errors.category_id.message}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700">
                Price (EGP) *
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-medium">
                  EGP
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="24.99"
                  className={`block w-full pl-12 pr-3 py-2 border rounded-lg text-base md:text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 ${
                    errors.price
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                  }`}
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Stock */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700">
                Stock Quantity *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                {...register('stock', { valueAsNumber: true })}
                placeholder="50"
                className={`mt-1 block w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  errors.stock
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                }`}
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-red-600 font-medium min-w-0 break-words">
                  {errors.stock.message}
                </p>
              )}
            </div>
          </div>

          {/* Cloudinary Image Upload Component */}
          <div className="border-t border-gray-100 pt-6 min-w-0">
            <Controller
              name="image_url"
              control={control}
              render={({ field }) => (
                <ProductImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.image_url?.message}
                />
              )}
            />
          </div>

          {/* Featured Toggle */}
          <div className="border-t border-gray-100 pt-6 min-w-0">
            <div className="flex items-center space-x-3 min-w-0">
              <input
                id="is_featured"
                type="checkbox"
                {...register('is_featured')}
                className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer flex-shrink-0"
              />
              <label
                htmlFor="is_featured"
                className="inline-flex items-center min-h-[44px] md:min-h-0 text-sm font-medium text-gray-900 cursor-pointer min-w-0 break-words"
              >
                Mark as Featured Product
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-7 min-w-0 break-words">
              Featured products receive higher priority placement across store showcases
            </p>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-0 sm:space-x-3 min-w-0">
            <Link
              to="/products"
              className="flex items-center justify-center w-full sm:w-auto min-h-[44px] md:min-h-0 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center w-full sm:w-auto min-h-[44px] md:min-h-0 space-x-2 px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditMode ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
