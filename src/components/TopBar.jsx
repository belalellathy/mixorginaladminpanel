import React from 'react'
import { LogOut, User } from 'lucide-react'
import { useAdminStore } from '../store/adminStore'
import { supabase } from '../lib/supabase'

export default function TopBar() {
  const adminUser = useAdminStore((state) => state.adminUser)

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      console.error('Logout failed')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center space-x-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          System Online
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          <User className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{adminUser?.email || 'Admin'}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-sm text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors font-medium"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  )
}