// User types
export interface User {
  id: string
  line_user_id: string
  created_at?: string
}

export interface Profile {
  id: string
  line_user_id: string
  display_name: string
  phone?: string
  email?: string
  address?: string
  coordinates?: any
  is_admin: boolean
  created_at: string
  updated_at: string
}

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  image_url?: string
  is_available: boolean
  category?: string
  weight_kg?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

// Cart types
export interface CartItem {
  product_id: string
  product_name: string
  product_image?: string
  unit_price: number
  quantity: number
  max_quantity: number
}

// Order types
export type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'problem'

export interface Order {
  id: string
  user_id: string
  order_number: string
  total_price: number
  shipping_fee: number
  shipping_address: string
  shipping_coordinates?: any
  shipping_method: 'delivery' | 'pickup'
  status: OrderStatus
  payment_slip_url?: string
  trans_ref?: string
  thunder_verified: boolean
  verified_at?: string
  line_message_id?: string
  estimated_distance_km?: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  product?: Product
}

// Store settings
export interface StoreSettings {
  id: string
  store_name: string
  store_address?: string
  store_coordinates?: any
  flat_shipping_fee: number
  shipping_radius_km: number
  is_store_open: boolean
  line_notify_token?: string
  line_notify_user_id?: string
  created_at: string
  updated_at: string
}

// Activity log
export interface ActivityLog {
  id: string
  user_id?: string
  action_type: string
  table_name?: string
  record_id?: string
  old_data?: any
  new_data?: any
  ip_address?: string
  user_agent?: string
  error_message?: string
  created_at: string
  user?: {
    display_name: string
  }
}

// API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Thunder API
export interface ThunderVerificationRequest {
  order_id: string
  trans_ref: string
  amount: number
  slip_url: string
  slip_image_base64?: string
}

export interface ThunderVerificationResponse {
  success: boolean
  verified: boolean
  amount: number
  trans_ref: string
  timestamp: string
  message?: string
  error?: string
}

// LINE LIFF
export interface LineUserProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LineContext {
  type: 'utou' | 'room' | 'group' | 'none'
  viewType: 'full' | 'tall' | 'compact'
  userId?: string
  utouId?: string
  roomId?: string
  groupId?: string
}

// Google Maps
export interface MapCoordinates {
  lat: number
  lng: number
}

export interface GeocodingResult {
  address: string
  coordinates: MapCoordinates
  formatted_address: string
  place_id: string
}

// Form types
export interface CheckoutFormData {
  shipping_method: 'delivery' | 'pickup'
  shipping_address: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  notes?: string
}
