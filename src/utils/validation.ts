import { z } from 'zod'

// Phone number validation for Thailand
export const phoneSchema = z.string()
  .min(9, 'Phone number is too short')
  .max(10, 'Phone number is too long')
  .regex(/^0[0-9]{1,2}[0-9]{7}$/, 'Invalid Thai phone number format')

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''))

// Thai ID card validation (13 digits)
export const thaiIdSchema = z.string()
  .length(13, 'Thai ID must be 13 digits')
  .regex(/^[0-9]{13}$/, 'Thai ID must contain only numbers')

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Bank account validation
export const bankAccountSchema = z.string()
  .min(10, 'Bank account must be at least 10 digits')
  .max(15, 'Bank account is too long')
  .regex(/^[0-9]+$/, 'Bank account must contain only numbers')

// Price validation
export const priceSchema = z.number()
  .min(0, 'Price cannot be negative')
  .max(1000000, 'Price is too high')

// Stock validation
export const stockSchema = z.number()
  .int('Stock must be an integer')
  .min(0, 'Stock cannot be negative')
  .max(10000, 'Stock is too high')

// Coordinate validation
export const coordinateSchema = z.object({
  lat: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
})

// Payment slip validation
export const paymentSlipSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  trans_ref: z.string().min(5, 'Transaction reference is required'),
  slip_url: z.string().url('Invalid slip URL'),
})

// Order item validation
export const orderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().positive('Unit price must be positive'),
})

// Shipping address validation
export const shippingAddressSchema = z.object({
  address: z.string().min(10, 'Address is too short').max(500, 'Address is too long'),
  district: z.string().min(2, 'District is required'),
  province: z.string().min(2, 'Province is required'),
  postal_code: z.string().regex(/^[0-9]{5}$/, 'Invalid postal code'),
})

// Validate file upload
export const validateFile = (file: File, options?: {
  maxSize?: number // in bytes
  allowedTypes?: string[]
}): { valid: boolean; error?: string } => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/*', 'application/pdf'] } = options || {}
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
    }
  }
  
  if (!allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0]
      return file.type.startsWith(`${category}/`)
    }
    return file.type === type
  })) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    }
  }
  
  return { valid: true }
}

// Validate LINE LIFF user
export const validateLineUser = (user: any): boolean => {
  return Boolean(
    user?.userId &&
    user?.displayName &&
    typeof user.userId === 'string' &&
    user.userId.length > 0
  )
}

// Validate Thunder API response
export const validateThunderResponse = (response: any): boolean => {
  return Boolean(
    response &&
    typeof response.success === 'boolean' &&
    (response.success === false || response.verified === true) &&
    response.trans_ref &&
    response.amount > 0
  )
}

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 1000) // Limit length
}

// Format currency for display
export const formatCurrency = (amount: number, currency: string = 'THB'): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Validate store settings
export const validateStoreSettings = (settings: any): string[] => {
  const errors: string[] = []
  
  if (!settings.store_name?.trim()) {
    errors.push('Store name is required')
  }
  
  if (typeof settings.flat_shipping_fee !== 'number' || settings.flat_shipping_fee < 0) {
    errors.push('Invalid shipping fee')
  }
  
  if (typeof settings.shipping_radius_km !== 'number' || settings.shipping_radius_km <= 0) {
    errors.push('Invalid shipping radius')
  }
  
  return errors
}
