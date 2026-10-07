import React from 'react'
import { LogOut, User, Menu } from 'lucide-react'
import { useAdminStore } from '../store/adminStore'
import { supabase } from '../lib/supabase'

export default function TopBar({ isSidebarOpen = false, onToggle, toggleRef }) {
  const adminUser = useAdminStore((state) => state.adminUser)

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      console.error('Logout failed')
    }
  }

  return (
    <header className="h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Hamburger Button (>= 44x44px touch target) */}
        <button
          ref={toggleRef}
          type="button"
          onClick={onToggle}
          aria-label={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
          aria-expanded={isSidebarOpen}
          className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:inline">
            System Online
          </span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider sm:hidden">
            Online
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 max-w-[150px] sm:max-w-[240px] md:max-w-none">
          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium truncate text-xs sm:text-sm">
            {adminUser?.email || 'Admin'}
          </span>
        </div>

        <button
          onClick={logout}
          aria-label="Sign out"
          className="flex items-center justify-center space-x-1.5 text-sm text-gray-600 hover:text-red-600 px-2.5 sm:px-3 py-1.5 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors font-medium min-h-[40px] min-w-[40px]"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}