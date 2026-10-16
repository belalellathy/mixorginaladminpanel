import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * S10 — Map raw Supabase/PostgREST errors to generic user-facing strings.
 * Logs only a static action label plus a non-sensitive code/status; never
 * the error object itself or anything derived from user input.
 *
 * @param {unknown} error - The caught error.
 * @param {'delete'|'save'|'load'} [context] - Operation kind.
 * @returns {string} Generic display message.
 */
export function getDisplayError(error, context) {
  const code = error?.code ?? error?.status
  console.error(`[Admin Error] ${context ?? 'unknown'} failed${code === undefined ? '' : ` (${code})`}`)
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
  if (error) {
    // Log a static string only — never the raw error object (avoids
    // leaking Supabase internals into logs/telemetry consumers).
    console.error('fetchAllOrders failed')
    const errOut = new Error('Failed to load orders')
    // Preserve the PostgREST code (e.g. PGRST103 range error) so callers
    // can distinguish an out-of-range page without seeing raw details.
    if (error.code) errOut.code = error.code
    throw errOut
  }
  return { orders: data || [], totalCount: count || 0 }
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
  // Delete the order row only. ON DELETE CASCADE removes order_items AFTER
  // the BEFORE DELETE trigger has restored stock; deleting items first
  // would leave the trigger with nothing to read and silently skip the restore.
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .select('id')

  if (error) throw new Error(error.message)

  // RLS: a non-admin DELETE returns success with zero rows (no error).
  if (!data || data.length === 0) {
    throw new Error('Order not found or you do not have permission to delete it.')
  }

  // Only after the DB delete succeeds, remove the payment screenshot
  // (best-effort) so a failed delete can't leave the order without its proof.
  if (paymentScreenshotPath) {
    // Normalise: strip any leading "receipts/" to avoid doubling the prefix
    const cleanPath = paymentScreenshotPath.startsWith('receipts/')
      ? paymentScreenshotPath
      : `receipts/${paymentScreenshotPath}`
    await supabase.storage
      .from('payment-screenshots')
      .remove([cleanPath])
    // Ignore storage errors — DB delete already succeeded
  }
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
  if (error) {
    // Log a static string only — never the raw error object.
    console.error('fetchAllProducts failed')
    throw new Error('Failed to load products')
  }
  return data || []
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
  // .select('id') is required: a PostgREST DELETE that matches zero rows
  // (RLS-filtered, already deleted, wrong id) still returns success with no
  // error, so only returned rows prove a row was actually deleted.
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('deleteProduct failed')
    const errOut = new Error('Failed to delete product')
    if (error.code) errOut.code = error.code
    throw errOut
  }

  if (!data || data.length === 0) {
    console.error('deleteProduct failed')
    const errOut = new Error('Product could not be deleted')
    errOut.code = 'NOT_FOUND_OR_BLOCKED'
    throw errOut
  }
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
 * Shipping Rates API — per-governorate delivery prices (fixed 27-row reference set).
 * No INSERT/DELETE exists for this table; only price/is_active are updatable.
 */

const SHIPPING_RATES_COLUMNS =
  'id, code, name_en, name_ar, price, is_active, sort_order'

function normalizeShippingPrice(value) {
  // PostgREST returns numeric(10,2) as a string; normalize so comparisons
  // and formatting in the UI operate on real numbers. NULL stays NULL.
  if (value === null || value === undefined) return null
  return Number(value)
}

export async function fetchShippingRates() {
  const { data, error } = await supabase
    .from('shipping_rates')
    .select(SHIPPING_RATES_COLUMNS)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[Admin Error] Could not load shipping rates.')
    throw new Error('Failed to load data. Please refresh the page.')
  }
  return (data || []).map((row) => ({
    ...row,
    price: normalizeShippingPrice(row.price),
  }))
}

export async function updateShippingRate(id, changes) {
  // Column grants allow UPDATE only on (price, is_active); including any
  // other column in the payload fails with 42501, so whitelist strictly.
  const payload = {}
  if (changes && Object.prototype.hasOwnProperty.call(changes, 'price')) {
    payload.price = changes.price
  }
  if (changes && Object.prototype.hasOwnProperty.call(changes, 'is_active')) {
    payload.is_active = changes.is_active
  }

  const { data, error } = await supabase
    .from('shipping_rates')
    .update(payload)
    .eq('id', id)
    .select('id, price, is_active')
    .maybeSingle()

  if (error) {
    console.error('[Admin Error] Could not save shipping rate.')
    const code = error.code || ''
    const message = String(error.message || '')
    if (
      code === '23514' ||
      message.includes('shipping_rates_active_requires_price')
    ) {
      throw new Error('Set a price before activating this governorate')
    }
    if (code === '42501') {
      throw new Error('You do not have permission to update shipping prices')
    }
    throw new Error('Could not save. Please try again.')
  }

  // RLS: a non-admin UPDATE returns success with zero rows (no error),
  // so no row coming back means the caller lacked permission.
  if (!data) {
    console.error('[Admin Error] Could not save shipping rate.')
    throw new Error('You do not have permission to update shipping prices')
  }

  return { ...data, price: normalizeShippingPrice(data.price) }
}

/**
 * Dashboard Stats
 */

export const getDashboardStats = async () => {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw error
  // Aggregations over an empty orders table come back NULL, so normalize
  // every field here; `= {}` defaults at the call site can't catch null.
  const stats = data ?? {}
  const rawCounts = stats.statusCounts ?? {}
  return {
    ...stats,
    total_orders: stats.total_orders ?? 0,
    revenue_today: stats.revenue_today ?? 0,
    revenueThisMonth: stats.revenueThisMonth ?? 0,
    // All six CHECK-constraint statuses always present (0 when absent).
    statusCounts: {
      pending: rawCounts.pending ?? 0,
      payment_review: rawCounts.payment_review ?? 0,
      confirmed: rawCounts.confirmed ?? 0,
      shipped: rawCounts.shipped ?? 0,
      delivered: rawCounts.delivered ?? 0,
      rejected: rawCounts.rejected ?? 0,
    },
    last7DaysChart: stats.last7DaysChart ?? [],
    recentOrders: stats.recentOrders ?? [],
  }
}
