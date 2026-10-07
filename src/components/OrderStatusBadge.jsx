import React from 'react'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  payment_review: {
    label: 'Payment Review',
    classes: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-green-50 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
  shipped: {
    label: 'Shipped',
    classes: 'bg-purple-50 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  delivered: {
    label: 'Delivered',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
}

export default function OrderStatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${config.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${config.dot}`}></span>
      {config.label}
    </span>
  )
}
