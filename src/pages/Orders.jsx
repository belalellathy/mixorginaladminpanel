import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { fetchAllOrders, deleteOrder, getDisplayError } from '../lib/supabase'
import OrderStatusBadge from '../components/OrderStatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'payment_review', label: 'Payment Review' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'rejected', label: 'Rejected' },
]

const PAGE_SIZE = 10

// Reusable date & currency formatting helpers
const formatCurrency = (amount) => `EGP ${Number(amount || 0).toFixed(2)}`
const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

export default function Orders() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [orders, setOrders] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, payment_screenshot_url }
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchInput])

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAllOrders(activeTab, searchTerm, currentPage, PAGE_SIZE)
      setOrders(data.orders)
      setTotalCount(data.totalCount)
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchTerm, currentPage])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const totalPages = useMemo(() => Math.ceil(totalCount / PAGE_SIZE) || 1, [totalCount])

  const handleTabChange = useCallback((tabId, e) => {
    if (e && e.currentTarget) {
      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
    setActiveTab(tabId)
    setCurrentPage(1)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteOrder(deleteTarget.id, deleteTarget.receipt_path ?? deleteTarget.payment_screenshot_url)
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id))
      setTotalCount((prev) => Math.max(prev - 1, 0))
      setDeleteTarget(null)
    } catch (err) {
      setError(getDisplayError(err, 'delete'))
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget])

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
              Orders Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
              Search, filter, inspect customer orders, and update fulfillment
            </p>
          </div>
          <button
            onClick={loadOrders}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors flex-shrink-0 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filter Tabs: Horizontal scrollable row with no-scrollbar */}
        <div className="border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar scroll-smooth">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={(e) => handleTabChange(tab.id, e)}
                  className={`py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                    isActive
                      ? 'border-gray-900 text-gray-900 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Search Bar: Full width on mobile, result count stacks below */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="search"
              inputMode="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by customer name or phone..."
              className="block w-full pl-9 pr-3 py-2.5 md:py-2 border border-gray-300 rounded-lg text-base md:text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm min-h-[44px]"
            />
          </div>

          <span className="text-xs font-medium text-gray-500">
            Showing {orders.length} of {totalCount} orders
          </span>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-semibold">Unable to fetch orders</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Orders Presentation: Mobile Cards (< md) & Desktop Table (>= md) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-gray-900">No orders found</p>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {searchTerm
                  ? `No orders matching "${searchTerm}". Try another search term.`
                  : 'There are currently no orders under this status filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Presentation 1: Mobile Cards (< md) */}
              <div className="md:hidden divide-y divide-gray-100">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 min-h-[44px]"
                  >
                    {/* Primary tap area navigating to detail */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/orders/${order.id}`)
                        }
                      }}
                      aria-label={`View order #${order.id.slice(0, 8)}`}
                      className="flex-1 min-w-0 cursor-pointer space-y-1.5 focus:outline-none"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-medium text-gray-600">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(order.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate min-w-0">
                          {order.full_name || 'Anonymous'}
                        </p>
                        <OrderStatusBadge status={order.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(order.total_price)}
                        </span>
                        <span className="text-gray-500 truncate max-w-[140px]">
                          {order.phone || order.email || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Sibling Delete Button (>= 44x44px tap target, outside card link) */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(order)}
                      aria-label={`Delete order #${order.id.slice(0, 8)}`}
                      className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center flex-shrink-0 transition-colors"
                      title="Delete order"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Presentation 2: Desktop Table (>= md, unchanged desktop markup & classes) */}
              <div className="hidden md:block overflow-x-auto min-h-[300px]">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3">Order ID</th>
                      <th scope="col" className="px-6 py-3">Customer</th>
                      <th scope="col" className="px-6 py-3">Contact</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Total</th>
                      <th scope="col" className="px-6 py-3">Date</th>
                      <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-gray-600 font-medium">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {order.full_name || 'Anonymous'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          <div>{order.email || '—'}</div>
                          <div className="text-gray-400 mt-0.5">{order.phone || '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(order.total_price)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-3" onClick={(e) => e.stopPropagation()}>
                            <span
                              className="text-xs font-semibold text-gray-700 hover:text-black cursor-pointer"
                              onClick={() => navigate(`/orders/${order.id}`)}
                            >
                              View &rarr;
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(order)}
                              className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination footer */}
          {!isLoading && orders.length > 0 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="flex items-center px-3 sm:px-3 py-2 sm:py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors min-h-[44px] min-w-[44px] justify-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="flex items-center px-3 sm:px-3 py-2 sm:py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors min-h-[44px] min-w-[44px] justify-center"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Order"
          message="Are you sure you want to delete this order? This will permanently delete the order, all its items, and the payment screenshot. This action cannot be undone."
          confirmText="Delete Order"
          onConfirm={handleDeleteConfirm}
          onCancel={() => !isDeleting && setDeleteTarget(null)}
          isDestructive={true}
          isLoading={isDeleting}
        />
      </div>
    </>
  )
}
