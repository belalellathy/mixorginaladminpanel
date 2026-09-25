import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Package,
  Save,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react'
import {
  fetchOrderById,
  updateOrderStatus,
  updateOrderTracking,
  updateOrderNotes,
  getPaymentScreenshotSignedUrl,
  deleteOrder,
  getDisplayError,
  isValidationError,
} from '../lib/supabase'
import OrderStatusBadge from '../components/OrderStatusBadge'
import OrderStatusSelect from '../components/OrderStatusSelect'
import ConfirmDialog from '../components/ConfirmDialog'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [signedScreenshotUrl, setSignedScreenshotUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form states for mutations
  const [trackingNumber, setTrackingNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('pending')

  // Feedback states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false)
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const loadOrder = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchOrderById(id)
      setOrder(data)
      setStatus(data.status || 'pending')
      setTrackingNumber(data.tracking_number || '')
      setNotes(data.notes || '')

      // Generate signed URL if receipt_path is present
      const receiptPath = data.receipt_path ?? data.payment_screenshot_url
      if (receiptPath) {
        const signed = await getPaymentScreenshotSignedUrl(receiptPath)
        setSignedScreenshotUrl(signed)
      }
    } catch (err) {
      setError(getDisplayError(err, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleStatusChange = async (newStatus) => {
    const prevStatus = order?.status || 'pending'
    setStatus(newStatus)
    setIsUpdatingStatus(true)
    setError(null)
    try {
      await updateOrderStatus(id, newStatus)
      setOrder((prev) => ({ ...prev, status: newStatus }))
      showSuccess('Order status updated successfully.')
    } catch (err) {
      setError(isValidationError(err) ? err.message : getDisplayError(err, 'save'))
      setStatus(prevStatus)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveTracking = async (e) => {
    e.preventDefault()
    setIsUpdatingTracking(true)
    setError(null)
    try {
      await updateOrderTracking(id, trackingNumber.trim())
      setOrder((prev) => ({ ...prev, tracking_number: trackingNumber.trim() }))
      showSuccess('Tracking number updated.')
    } catch (err) {
      setError(isValidationError(err) ? err.message : getDisplayError(err, 'save'))
    } finally {
      setIsUpdatingTracking(false)
    }
  }

  const handleSaveNotes = async (e) => {
    e.preventDefault()
    setIsUpdatingNotes(true)
    setError(null)
    try {
      await updateOrderNotes(id, notes)
      setOrder((prev) => ({ ...prev, notes }))
      showSuccess('Internal notes saved.')
    } catch (err) {
      setError(isValidationError(err) ? err.message : getDisplayError(err, 'save'))
    } finally {
      setIsUpdatingNotes(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteOrder(id, order?.receipt_path ?? order?.payment_screenshot_url)
      navigate('/orders')
    } catch (err) {
      setError(getDisplayError(err, 'delete'))
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Orders
        </Link>
        <div className="rounded-xl bg-red-50 p-6 border border-red-200">
          <div className="flex items-center space-x-3 text-red-700 font-semibold mb-2">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load order</span>
          </div>
          <p className="text-sm text-red-600">{error || 'Order not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back button & Title bar */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Orders
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Order #{order.id.slice(0, 8)}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Placed on{' '}
            {order.created_at
              ? new Date(order.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Unknown date'}
          </p>
        </div>

        {/* Status Dropdown in header */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status:
          </span>
          <OrderStatusSelect
            value={status}
            onChange={handleStatusChange}
            disabled={isUpdatingStatus}
          />
        </div>
      </div>

      {/* Success notification banner */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-3 border border-green-200 flex items-center space-x-2 text-sm text-green-800 font-medium animate-fade-in">
          <Check className="w-4 h-4 text-green-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error notification banner */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex items-center space-x-2 text-sm text-red-800 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rejected warning banner */}
      {order.status === 'rejected' && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">Order Rejected</p>
            <p className="mt-0.5">
              This order has been rejected and will be automatically deleted after 10 days.
              You can still change the status above if this was a mistake.
            </p>
          </div>
        </div>
      )}

      {/* Main Order Content Layout (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Order Items & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <Package className="w-4 h-4 mr-2 text-gray-500" />
                Purchased Items ({order.order_items?.length || 0})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Product</th>
                    <th scope="col" className="px-6 py-3">Quantity</th>
                    <th scope="col" className="px-6 py-3">Unit Price</th>
                    <th scope="col" className="px-6 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {!order.order_items || order.order_items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-sm">
                        No item records found for this order.
                      </td>
                    </tr>
                  ) : (
                    order.order_items.map((item) => {
                      const unitPrice = Number(item.unit_price) || 0
                      const qty = Number(item.quantity) || 1
                      const subtotal = unitPrice * qty
                      const productName = item.products?.name || `Product #${item.product_id?.slice(0, 8)}`
                      const productImg = item.products?.image_url

                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {productImg ? (
                                <img
                                  src={productImg}
                                  alt={productName}
                                  className="w-10 h-10 object-cover rounded-md border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900">
                                {productName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {qty}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            EGP {unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            EGP {subtotal.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Price Bar */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Total Amount Paid
              </span>
              <span className="text-xl font-bold text-gray-900">
                EGP {Number(order.total_price || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center border-b border-gray-100 pb-3">
              <User className="w-4 h-4 mr-2 text-gray-500" />
              Customer Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Customer Name
                </span>
                <p className="font-medium text-gray-900 mt-1">
                  {order.full_name || 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Email
                </span>
                <p className="font-medium text-gray-900 mt-1 flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {order.email || 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Phone Number
                </span>
                <p className="font-medium text-gray-900 mt-1 flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {order.phone || 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Delivery Address
                </span>
                <p className="font-medium text-gray-900 mt-1 flex items-start">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{order.address || 'N/A'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Fulfillment Actions & Screenshot */}
        <div className="space-y-6">
          {/* Tracking Number Editor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
              Shipping Tracking Number
            </h3>
            <form onSubmit={handleSaveTracking} className="space-y-3">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK-98492019"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
              <button
                type="submit"
                disabled={isUpdatingTracking}
                className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
              >
                {isUpdatingTracking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Tracking
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-gray-500" />
              Internal Notes
            </h3>
            <form onSubmit={handleSaveNotes} className="space-y-3">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private operational notes about this order..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
              />
              <button
                type="submit"
                disabled={isUpdatingNotes}
                className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isUpdatingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Notes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Payment Proof / Screenshot */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
              <ImageIcon className="w-4 h-4 mr-1.5 text-gray-500" />
              Payment Proof
            </h3>

            {signedScreenshotUrl ? (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={signedScreenshotUrl}
                    alt="Payment proof screenshot"
                    className="w-full h-48 object-contain bg-black/5"
                  />
                </div>
                <a
                  href={signedScreenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  Download Screenshot
                </a>
              </div>
            ) : (
              <div className="py-8 px-4 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">
                  No payment screenshot uploaded for this order.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Order Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Order</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Order"
        message="Are you sure you want to delete this order? This will permanently delete the order, all its items, and the payment screenshot. This action cannot be undone."
        confirmText="Delete Order"
        onConfirm={handleDeleteConfirm}
        onCancel={() => !isDeleting && setShowDeleteDialog(false)}
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  )
}
