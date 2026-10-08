import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Banknote,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  CheckSquare,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getDashboardStats, getDisplayError } from '../lib/supabase'
import OrderStatusBadge from '../components/OrderStatusBadge'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const {
    total_orders = 0,
    revenue_today = 0,
    revenueThisMonth = 0,
    statusCounts = {},
    last7DaysChart = [],
    recentOrders = [],
  } = useMemo(() => stats || {}, [stats])

  const handleOrderClick = useCallback(
    (orderId) => navigate(`/orders/${orderId}`),
    [navigate]
  )

  const tooltipFormatter = useCallback(
    (val, name) => [val, name === 'orders' ? 'Orders' : name],
    []
  )

  // Format chart X-axis dates compactly so labels don't collide at 360px
  const formatChartDate = useCallback((val) => {
    if (!val) return ''
    if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('-')
      if (parts.length === 3) {
        return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`
      }
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return `${d.getMonth() + 1}/${d.getDate()}`
    }
    return String(val)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading dashboard overview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 border border-red-200">
        <div className="flex items-center space-x-3 text-red-700 font-semibold mb-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading dashboard</span>
        </div>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="inline-flex items-center px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors min-h-[44px]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
            Real-time business performance, revenue metrics, and order activity
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors flex-shrink-0 min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Top Level Metric Cards: 1 col on mobile, 2 col on sm, 3 col on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              {total_orders}
            </span>
            <span className="text-xs text-gray-500 ml-2">all time</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Revenue Today
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              EGP {Number(revenue_today || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-500 ml-2">today's sales</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm min-w-0 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Revenue This Month
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              EGP {revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-500 ml-2">current month</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown Cards: 2 on mobile, 3 on sm, 6 on lg */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
          Orders by Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-yellow-600 text-xs font-semibold uppercase">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Pending</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {statusCounts.pending || 0}
            </p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-blue-600 text-xs font-semibold uppercase">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Payment Review</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {statusCounts.payment_review || 0}
            </p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-green-600 text-xs font-semibold uppercase">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Confirmed</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {statusCounts.confirmed || 0}
            </p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-purple-600 text-xs font-semibold uppercase">
              <Truck className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Shipped</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {statusCounts.shipped || 0}
            </p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 text-xs font-semibold uppercase">
              <CheckSquare className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Delivered</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {statusCounts.delivered || 0}
            </p>
          </div>

          <div className="bg-red-50 p-3.5 sm:p-4 rounded-xl border border-red-200 shadow-sm min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-red-600 text-xs font-semibold uppercase">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal leading-tight">Rejected</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-700 mt-2">
              {statusCounts.rejected || 0}
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Orders Bar Chart: wrapped in ResponsiveContainer, height h-56 sm:h-72 */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">
              Orders Volume (Last 7 Days)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily order counts across the past week
            </p>
          </div>
        </div>

        <div className="h-56 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={last7DaysChart}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                formatter={tooltipFormatter}
                cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="orders" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders: Stacked cards on mobile (< md), Table on desktop (>= md) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Recent Orders
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              The 5 most recent customer purchases
            </p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-gray-700 hover:text-black hover:underline min-h-[44px] flex items-center"
          >
            View all orders &rarr;
          </Link>
        </div>

        {/* Presentation 1: Mobile Cards (< md) */}
        <div className="md:hidden divide-y divide-gray-100">
          {recentOrders.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No orders recorded yet.
            </div>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOrderClick(order.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOrderClick(order.id)
                  }
                }}
                aria-label={`View order #${order.id.slice(0, 8)}`}
                className="p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors flex flex-col space-y-2.5 min-h-[44px]"
              >
                {/* Card Top: Order ID & Date */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono font-medium text-gray-700">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span>{formatDate(order.created_at)}</span>
                </div>

                {/* Card Middle: Customer & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm truncate min-w-0">
                    {order.full_name || 'Anonymous Customer'}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Card Bottom: Total Price & Tap Action */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatCurrency(order.total_price)}
                  </span>
                  <span className="inline-flex items-center text-xs font-medium text-gray-600">
                    Details
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-gray-400" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Presentation 2: Desktop Table (>= md, unchanged desktop markup & classes) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">Order ID</th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Total</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleOrderClick(order.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 font-medium">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {order.full_name || 'Anonymous Customer'}
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
                      <span className="text-xs font-medium text-gray-600 hover:text-black">
                        Details &rarr;
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
