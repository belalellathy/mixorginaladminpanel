import React from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
        <FileQuestion className="w-6 h-6" />
      </div>
      <p className="text-base font-semibold text-gray-900">Page not found</p>
      <p className="text-sm text-gray-500 max-w-sm mt-1">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center px-3.5 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors min-h-[44px] md:min-h-0"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
