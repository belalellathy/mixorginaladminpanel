import React, { useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadProductImage } from '../lib/cloudinary'

export default function ProductImageUpload({ value, onChange, error }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic client validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be under 5MB')
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      const url = await uploadProductImage(file)
      onChange(url)
    } catch (err) {
      console.error('Cloudinary upload failed:', err)
      setUploadError('Image upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset input value so same file can be re-selected if needed
      e.target.value = ''
    }
  }

  const handleRemove = () => {
    onChange('')
    setUploadError(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Product Image
      </label>

      {value ? (
        <div className="relative inline-block border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm group">
          <img
            src={value}
            alt="Product"
            className="w-40 h-40 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-md text-gray-600 hover:text-red-600 transition-colors"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors relative">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 text-gray-700 animate-spin" />
              <span className="text-xs text-gray-500 font-medium">
                Uploading to Cloudinary...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="mb-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Click to upload</span> product image
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}

      {(uploadError || error) && (
        <p className="text-xs text-red-600 font-medium">
          {uploadError || error}
        </p>
      )}
    </div>
  )
}
