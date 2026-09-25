import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  fetchAllProducts,
  updateProduct,
  deleteProduct,
  getDisplayError,
} from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Confirm delete dialog state
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchInput])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAllProducts(searchTerm)
      setProducts(data)
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Handle toggling is_featured
  const handleToggleFeatured = async (product, e) => {
    e.stopPropagation()
    const nextFeatured = !product.is_featured
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_featured: nextFeatured } : p
      )
    )

    try {
      await updateProduct(product.id, { is_featured: nextFeatured })
    } catch (err) {
      setError(getDisplayError(err, 'save'))
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_featured: product.is_featured } : p
        )
      )
    }
  }

  // Handle delete execution
  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setIsDeleting(true)
    try {
      await deleteProduct(productToDelete.id)
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setProductToDelete(null)
    } catch (err) {
      setError(getDisplayError(err, 'delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Products Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Mix Originals inventory, prices, images, and promotions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadProducts}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span>Refresh</span>
          </button>

          <Link
            to="/products/new"
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products by title..."
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm"
          />
        </div>

        <span className="text-xs font-medium text-gray-500">
          Showing {products.length} products
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">Unable to fetch products</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-gray-900">No products found</p>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {searchTerm
                  ? `No products matched "${searchTerm}". Try a different name.`
                  : 'Start by creating your first store product.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/products/new"
                  className="mt-4 inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-black"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Product
                </Link>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Product</th>
                  <th scope="col" className="px-6 py-3">Category</th>
                  <th scope="col" className="px-6 py-3">Price</th>
                  <th scope="col" className="px-6 py-3">Stock</th>
                  <th scope="col" className="px-6 py-3 text-center">Featured</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((product) => {
                  const hasImage = !!product.image_url
                  const isFeatured = !!product.is_featured

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Thumbnail & Title */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {hasImage ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-xs">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
                              {product.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        {product.categories ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            style={{
                              borderColor: product.categories.accent_color || '#e5e7eb',
                              borderLeftWidth: '3px',
                            }}
                          >
                            {product.categories.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        EGP {Number(product.price || 0).toFixed(2)}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            Number(product.stock) > 5
                              ? 'bg-green-50 text-green-700'
                              : Number(product.stock) > 0
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {product.stock} in stock
                        </span>
                      </td>

                      {/* Featured Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFeatured(product, e)}
                          title={isFeatured ? 'Remove from featured' : 'Mark as featured'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isFeatured
                              ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-50 text-gray-300 border-gray-200 hover:text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Star
                            className="w-4 h-4"
                            fill={isFeatured ? 'currentColor' : 'none'}
                          />
                        </button>
                      </td>

                      {/* Actions (Edit / Delete) */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be reversed.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  )
}
