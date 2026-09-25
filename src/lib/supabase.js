import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * S10 — Map raw Supabase/PostgREST errors to generic user-facing strings.
 * Always logs the full error for debugging, never leaks it to the UI.
 *
 * @param {unknown} error - The caught error.
 * @param {'delete'|'save'|'load'} [context] - Operation kind.
 * @returns {string} Generic display message.
 */
export function getDisplayError(error, context) {
  console.error('[Admin Error]', error)
  switch (context) {
    case 'delete':
      return 'Failed to delete. Please try again.'
    case 'save':
      return 'Failed to save changes. Please try again.'
    case 'load':
      return 'Failed to load data. Please refresh the page.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * S6 — Sanitize free-text search before interpolating into PostgREST filters.
 * - Trims whitespace, truncates to 100 chars.
 * - Escapes ILIKE wildcards (\, %, _) with a backslash.
 * - Strips PostgREST `or` reserved characters: , ( ) " entirely.
 */
export function sanitizeSearch(input) {
  if (input === null || input === undefined) return ''
  let s = String(input).trim()
  if (s.length > 100) s = s.slice(0, 100)
  s = s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  s = s.replace(/[,()"']/g, '')
  return s.trim()
}

/**
 * S9 — Client-side field validation applied before every write.
 * These mirror the intended server-side constraints (DB CHECKs/enums should
 * enforce the same rules; this layer fails fast with a clear message).
 */
export const FIELD_RULES = {
  // Union of spec list + statuses actually used by the UI (payment_review).
  // DB enum should enforce the same set.
  STATUSES: [
    'pending',
    'payment_review',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'rejected',
    'cancelled',
  ],
  TRACKING_RE: /^[a-zA-Z0-9-]{0,100}$/,
  ACCENT_COLOR_RE: /^#[0-9a-fA-F]{6}$/,
  MAX_TRACKING: 100,
  MAX_NOTES: 1000,
  MAX_CATEGORY_NAME: 100,
}

function validationError(message) {
  const err = new Error(message)
  err.code = 'VALIDATION'
  return err
}

export function isValidationError(error) {
  return Boolean(error && error.code === 'VALIDATION')
}

function validateStatus(status) {
  if (!FIELD_RULES.STATUSES.includes(status)) {
    throw validationError(
      `Invalid status. Must be one of: ${FIELD_RULES.STATUSES.join(', ')}.`
    )
  }
}

function validateTrackingNumber(value) {
  const v = value === null || value === undefined ? '' : String(value)
  if (v.length > FIELD_RULES.MAX_TRACKING) {
    throw validationError('Tracking number must be 100 characters or fewer.')
  }
  if (v !== '' && !FIELD_RULES.TRACKING_RE.test(v)) {
    throw validationError(
      'Tracking number may contain only letters, numbers, and hyphens (max 100).'
    )
  }
  return v
}

function validateNotes(value) {
  const v = value === null || value === undefined ? '' : String(value)
  if (v.length > FIELD_RULES.MAX_NOTES) {
    throw validationError('Notes must be 1000 characters or fewer.')
  }
  return v
}

function validateAccentColor(value) {
  if (!FIELD_RULES.ACCENT_COLOR_RE.test(String(value || ''))) {
    throw validationError('Accent color must be a hex code like #1a2b3c.')
  }
}

function validateCategoryName(value) {
  const v = String(value || '').trim()
  if (!v) {
    throw validationError('Category name cannot be empty.')
  }
  if (v.length > FIELD_RULES.MAX_CATEGORY_NAME) {
    throw validationError('Category name must be 100 characters or fewer.')
  }
  return v
}

/**
 * Orders API
 */

export async function fetchAllOrders(status = 'all', search = '', page = 1, pageSize = 10) {
  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // S7 — explicit columns only. `email` kept because Orders.jsx renders
    // it (contact column). `receipt_path` is the storage path for order receipts.
    let query = supabase
      .from('orders')
      .select(
        'id, full_name, email, phone, total_price, status, created_at, receipt_path',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const clean = sanitizeSearch(search)
    if (clean) {
      query = query.or(`full_name.ilike.%${clean}%,phone.ilike.%${clean}%`)
    }

    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw error
    return { orders: data || [], totalCount: count || 0 }
  } catch (error) {
    console.error('[Admin Error]', error)
    return { orders: [], totalCount: 0 }
  }
}

export const fetchOrderById = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(id, name, price, image_url))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateOrderStatus(id, status) {
  validateStatus(status)
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateOrderTracking(id, trackingNumber) {
  const clean = validateTrackingNumber(trackingNumber).trim()
  const { data, error } = await supabase
    .from('orders')
    .update({ tracking_number: clean })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateOrderNotes(id, notes) {
  const clean = validateNotes(notes)
  const { data, error } = await supabase
    .from('orders')
    .update({ notes: clean })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOrder(orderId, paymentScreenshotPath) {
  // 1. Delete payment screenshot from storage if exists (best-effort)
  if (paymentScreenshotPath) {
    // Normalise: strip any leading "receipts/" to avoid doubling the prefix
    const cleanPath = paymentScreenshotPath.startsWith('receipts/')
      ? paymentScreenshotPath
      : `receipts/${paymentScreenshotPath}`
    await supabase.storage
      .from('payment-screenshots')
      .remove([cleanPath])
    // Ignore storage errors — proceed with DB delete regardless
  }

  // 2. Delete order items first (in case ON DELETE CASCADE is not configured)
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (itemsError) throw new Error(itemsError.message)

  // 3. Delete the order itself
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}

export async function getPaymentScreenshotSignedUrl(orderOrPath) {
  // Storage path lives in the `receipt_path` column, e.g.
  // receipts/1790120923764_017a8f42-35d6-4b6a-a230-fb1fd5ea7125.jpeg
  // Accept either the raw path string or the full order object (preferred).
  const filePath =
    typeof orderOrPath === 'string'
      ? orderOrPath
      : orderOrPath?.receipt_path ?? null
  if (!filePath) return null
  // If it's already a full HTTP URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  const { data, error } = await supabase.storage
    .from('payment-screenshots')
    .createSignedUrl(filePath, 3600)

  if (error) {
    console.error('Error generating signed URL:', error)
    return null
  }

  return data?.signedUrl || null
}

/**
 * Products API
 */

export async function fetchAllProducts(search = '') {
  try {
    // S7 — explicit columns. `description` + categories join kept because
    // Products.jsx renders them.
    let query = supabase
      .from('products')
      .select(
        'id, name, description, price, stock, category_id, image_url, is_featured, created_at, categories(id, name, slug, accent_color)'
      )
      .order('created_at', { ascending: false })

    const clean = sanitizeSearch(search)
    if (clean) {
      query = query.ilike('name', `%${clean}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Admin Error]', error)
    return []
  }
}

export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, description, price, stock, category_id, image_url, is_featured, created_at, categories(id, name, slug)'
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function insertProduct(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(id, productData) {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

/**
 * Categories API
 */

export async function fetchAllCategories() {
  // S7 — explicit columns. `slug` + `image_url` kept because
  // Categories.jsx renders them.
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, accent_color')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function updateCategory(id, categoryData) {
  const name = validateCategoryName(categoryData?.name)
  const accentColor = String(categoryData?.accent_color || '').trim()
  validateAccentColor(accentColor)
  const { data, error } = await supabase
    .from('categories')
    .update({ name, accent_color: accentColor })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Dashboard Stats
 */

export const getDashboardStats = async () => {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw error
  return data
}
