import axios from 'axios'
import toast from 'react-hot-toast'

const THUNDER_API_URL = import.meta.env.VITE_THUNDER_API_URL
const THUNDER_API_KEY = import.meta.env.VITE_THUNDER_API_KEY

if (!THUNDER_API_URL || !THUNDER_API_KEY) {
  console.warn('Thunder Solution API credentials not configured')
}

const thunderApi = axios.create({
  baseURL: THUNDER_API_URL,
  headers: {
    'Authorization': `Bearer ${THUNDER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
})

export interface PaymentVerificationRequest {
  order_id: string
  trans_ref: string
  amount: number
  slip_url: string
  slip_image_base64?: string
}

export interface PaymentVerificationResponse {
  success: boolean
  verified: boolean
  amount: number
  trans_ref: string
  timestamp: string
  message?: string
  error?: string
}

export const verifyPayment = async (
  data: PaymentVerificationRequest
): Promise<PaymentVerificationResponse> => {
  try {
    // In production, this would call the actual Thunder API
    // For now, we'll simulate the API response
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Validation rules (simulating Thunder API)
    const validationErrors = []
    
    if (!data.trans_ref || data.trans_ref.length < 5) {
      validationErrors.push('Invalid transaction reference')
    }
    
    if (data.amount <= 0) {
      validationErrors.push('Invalid amount')
    }
    
    if (!data.slip_url && !data.slip_image_base64) {
      validationErrors.push('No payment slip provided')
    }
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        verified: false,
        amount: data.amount,
        trans_ref: data.trans_ref,
        timestamp: new Date().toISOString(),
        error: validationErrors.join(', ')
      }
    }
    
    // Simulate successful verification
    return {
      success: true,
      verified: true,
      amount: data.amount,
      trans_ref: data.trans_ref,
      timestamp: new Date().toISOString(),
      message: 'Payment verified successfully'
    }
    
  } catch (error) {
    console.error('Thunder API error:', error)
    
    // Fallback: Use Supabase RPC for verification
    const { supabase } = await import('./supabaseClient')
    
    const { data, error: rpcError } = await supabase.rpc('verify_payment_slip', {
      p_order_id: data.order_id,
      p_trans_ref: data.trans_ref,
      p_expected_amount: data.amount,
      p_slip_url: data.slip_url
    })
    
    if (rpcError) {
      throw new Error(rpcError.message)
    }
    
    return {
      success: data.success,
      verified: data.success,
      amount: data.amount,
      trans_ref: data.trans_ref,
      timestamp: new Date().toISOString(),
      message: data.success ? 'Payment verified' : 'Verification failed'
    }
  }
}

export const uploadSlipImage = async (file: File): Promise<string> => {
  try {
    // Upload to Supabase Storage
    const { supabase } = await import('./supabaseClient')
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const filePath = `payment-slips/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('payments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('payments')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Error uploading slip:', error)
    toast.error('Failed to upload payment slip')
    throw error
  }
}
