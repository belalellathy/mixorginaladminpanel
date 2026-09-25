import { supabase } from './supabase'

/**
 * Uploads an image file to Cloudinary inside the 'product-images' folder
 * via a signed upload. Signature params come from the Supabase Edge
 * Function `cloudinary-sign`, so Cloudinary credentials never reach the
 * browser bundle.
 *
 * @param {File|Blob} file - The file to upload.
 * @returns {Promise<string>} The secure_url returned by Cloudinary.
 */
export async function uploadProductImage(file) {
  if (!file) {
    throw new Error('No file provided for upload.')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  if (!supabaseUrl) {
    throw new Error(
      'Supabase URL is missing. Please verify VITE_SUPABASE_URL in your .env file.'
    )
  }

  // Step 1: get signed upload params (authenticated admins only).
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || 'Failed to read session.')
  }

  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in as an admin to upload images.')
  }

  let signParams
  try {
    const signResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/functions/v1/cloudinary-sign`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (signResponse.status === 401) {
      throw new Error('Unauthorized: admin sign-in required for uploads.')
    }

    if (!signResponse.ok) {
      const errBody = await signResponse.json().catch(() => ({}))
      throw new Error(
        errBody.error ||
          `Failed to get upload signature (status: ${signResponse.status})`
      )
    }

    signParams = await signResponse.json()
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Could not reach the upload signing service.')
    }
    throw err
  }

  const { timestamp, signature, api_key, cloud_name, folder } = signParams || {}
  if (!timestamp || !signature || !api_key || !cloud_name) {
    throw new Error('Upload signing service returned an invalid response.')
  }

  // Step 2: upload directly to Cloudinary with the signed params.
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', api_key)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder || 'product-images')

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
        `Failed to upload image (status: ${uploadResponse.status})`
    )
  }

  const data = await uploadResponse.json()
  if (!data.secure_url) {
    throw new Error('Cloudinary response did not return a secure_url.')
  }

  return data.secure_url
}
