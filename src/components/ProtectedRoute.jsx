import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminStore } from '../store/adminStore'

export default function ProtectedRoute({ children }) {
  const adminUser = useAdminStore((state) => state.adminUser)
  const isLoading = useAdminStore((state) => state.isLoading)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // App.jsx uses <Route element={<ProtectedRoute />}> (layout-route style),
  // so render <Outlet /> when no explicit children were passed.
  return children ?? <Outlet />
}