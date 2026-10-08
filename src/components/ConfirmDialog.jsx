import React, { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true,
  isLoading = false,
}) {
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Save previous focus on open, focus Cancel button as safe default, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      // Small timeout ensures element is mounted and styled
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 0)
      return () => clearTimeout(timer)
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.()
      previousFocusRef.current = null
    }
  }, [isOpen])

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Handle Escape key and Tab focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isLoading) {
          onCancel()
        }
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop: backdrop click cancels, but never while loading/in-flight */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Center Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85dvh] flex flex-col p-6 border border-gray-100"
        >
          <div className="overflow-y-auto pr-1">
            <div className="flex items-start space-x-4">
              <div
                className={`p-2.5 rounded-full flex-shrink-0 ${
                  isDestructive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex-1 mt-0.5 min-w-0">
                <h3
                  id="confirm-dialog-title"
                  className="text-base font-semibold text-gray-900 leading-tight"
                >
                  {title}
                </h3>
                <p
                  id="confirm-dialog-message"
                  className="mt-2 text-sm text-gray-500 leading-normal break-words"
                >
                  {message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 w-full">
            <button
              ref={cancelButtonRef}
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50 min-h-[44px] md:min-h-0 flex items-center justify-center"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none transition-colors disabled:opacity-50 min-h-[44px] md:min-h-0 flex items-center justify-center ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400'
                  : 'bg-gray-900 hover:bg-black focus:ring-2 focus:ring-gray-400'
              }`}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
