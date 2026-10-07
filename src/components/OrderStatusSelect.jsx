import React from 'react'

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'payment_review', label: 'Payment Review' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rejected', label: 'Rejected' },
]

export default function OrderStatusSelect({
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className="relative w-full sm:w-auto inline-block text-left">
      <select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full min-h-[44px] rounded-md border border-gray-300 bg-white py-2 md:py-1.5 pl-3 pr-8 text-base md:text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 transition-colors ${className}`}
      >
        {ORDER_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
