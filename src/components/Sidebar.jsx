import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  CreditCard,
  Sparkles,
  X,
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Categories', path: '/categories', icon: Tags },
  { name: 'Payment Settings', path: '/payment-settings', icon: CreditCard },
]

export default function Sidebar({ isOpen = false, onClose }) {
  const closeButtonRef = useRef(null)

  // Move focus into the drawer when opened on mobile
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  return (
    <aside
      {...(isOpen
        ? {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Navigation sidebar',
          }
        : {
            'aria-label': 'Sidebar navigation',
          })}
      className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform motion-reduce:transition-none duration-300 ease-in-out ${
        isOpen
          ? 'translate-x-0 shadow-2xl visible'
          : '-translate-x-full lg:translate-x-0 invisible lg:visible'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm tracking-tight leading-none">
              Mix Originals
            </h1>
            <span className="text-xs text-gray-500 font-normal">Admin Panel</span>
          </div>
        </div>

        {/* Mobile close button (>=44x44px touch target) */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="lg:hidden p-2.5 -mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => {
                if (onClose) onClose()
              }}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3 text-gray-500" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p className="font-medium text-gray-500">Beauty Admin v1.0</p>
          <p>Internal operations tool</p>
        </div>
      </div>
    </aside>
  )
}
