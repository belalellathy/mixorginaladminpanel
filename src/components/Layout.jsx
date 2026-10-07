import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const toggleButtonRef = useRef(null)

  // Close drawer on route change and restore focus to hamburger if it was open
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false)
      toggleButtonRef.current?.focus()
    }
  }, [location.pathname])

  // Close drawer on Escape key (attached ONLY while open) and return focus
  useEffect(() => {
    if (!isSidebarOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false)
        toggleButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
    toggleButtonRef.current?.focus()
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  return (
    <div className="flex min-h-dvh h-dvh bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Backdrop Overlay (< lg) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: persistent on lg+, off-canvas drawer below lg */}
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onToggle={handleToggleSidebar}
          toggleRef={toggleButtonRef}
        />

        {/* Page Content with safe-area-inset-bottom support */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
