import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Package, CreditCard, Shield, AlertCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/store/cartStore'
import { useOrderStore } from '@/store/orderStore'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabaseClient'
import { calculateDistance } from '@/lib/mapsClient'
import AddressPicker from '@/components/customer/AddressPicker'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

const checkoutSchema = z.object({
  shipping_method: z.enum(['delivery', 'pickup']),
  shipping_address: z.string().min(1, 'Shipping address is required'),
  customer_name: z.string().min(1, 'Name is required'),
  customer_phone: z.string().min(1, 'Phone number is required').regex(/^[0-9+\-\s()]*$/, 'Invalid phone number'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const { createOrder, isLoading: isCreatingOrder } = useOrderStore()
  const { profile } = useUserStore()
  const [shippingCoordinates, setShippingCoordinates] = useState<{ lat: number; lng: number }>()
  const [shippingDistance, setShippingDistance] = useState<number>(0)
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [storeSettings, setStoreSettings] = useState<{
    flat_shipping_fee: number
    shipping_radius_km: number
    is_store_open: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_method: 'delivery',
      customer_name: profile?.display_name || '',
      customer_phone: profile?.phone || '',
      customer_email: profile?.email || '',
    },
  })

  const shippingMethod = watch('shipping_method')
  const shippingAddress = watch('shipping_address')

  useEffect(() => {
    fetchStoreSettings()
  }, [])

  useEffect(() => {
    if (shippingMethod === 'pickup') {
      setShippingFee(0)
      setValue('shipping_address', 'Store Pickup')
      setShippingCoordinates(undefined)
    }
  }, [shippingMethod, setValue])

  useEffect(() => {
    calculateShippingFee()
  }, [shippingDistance, shippingMethod])

  const fetchStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('flat_shipping_fee, shipping_radius_km, is_store_open')
        .single()
      
      if (error) throw error
      
      setStoreSettings(data)
    } catch (error) {
      console.error('Failed to fetch store settings:', error)
      toast.error('Failed to load store settings')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateShippingFee = async () => {
    if (!storeSettings || shippingMethod === 'pickup') {
      setShippingFee(0)
      return
    }

    if (shippingDistance > 0) {
      // Check if within shipping radius
      if (shippingDistance <= storeSettings.shipping_radius_km) {
        setShippingFee(storeSettings.flat_shipping_fee)
      } else {
        // Outside radius - show warning
        toast.error('Delivery outside service area. Please contact store.')
        setShippingFee(0)
      }
    } else {
      // Use flat fee as fallback
      setShippingFee(storeSettings.flat_shipping_fee)
    }
  }

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setValue('shipping_address', address, { shouldValidate: true })
    setShippingCoordinates(coordinates)
  }

  const handleDistanceCalculated = (distance: number) => {
    setShippingDistance(distance)
  }

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (!storeSettings?.is_store_open) {
      toast.error('Store is currently closed. Please try again later.')
      return
    }

    try {
      // Prepare order data
      const orderData = {
        shipping_address: data.shipping_address,
        shipping_coordinates: shippingCoordinates,
        shipping_method: data.shipping_method,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }

      const result = await createOrder(orderData)

      if (result.success && result.orderId) {
        // Navigate to payment page
        navigate(`/payment/${result.orderId}`)
        toast.success('Order created successfully! Please complete payment.')
      } else {
        toast.error(result.error || 'Failed to create order')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to process checkout')
    }
  }

  const totalPrice = getTotalPrice()
  const finalTotal = totalPrice + shippingFee

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading checkout..." />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">
            Add some products to your cart before checkout
          </p>
          <Link to="/shop">
            <Button>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <Link to="/cart" className="inline-flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Information */}
            <div className="rounded-xl border p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Shipping Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your delivery details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    {...register('customer_name')}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your name"
                  />
                  {errors.customer_name && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.customer_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    {...register('customer_phone')}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                  {errors.customer_phone && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.customer_phone.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    {...register('customer_email')}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your email for updates"
                  />
                  {errors.customer_email && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.customer_email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="rounded-xl border p-6 space-y-6">
              <h3 className="text-lg font-semibold">Shipping Method</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    value="delivery"
                    {...register('shipping_method')}
                    className="sr-only peer"
                  />
                  <div className="p-4 border rounded-lg cursor-pointer transition-all peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Delivery</div>
                        <div className="text-sm text-muted-foreground">
                          Get it delivered to your location
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    value="pickup"
                    {...register('shipping_method')}
                    className="sr-only peer"
                  />
                  <div className="p-4 border rounded-lg cursor-pointer transition-all peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Store Pickup</div>
                        <div className="text-sm text-muted-foreground">
                          Pick up from our store location
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Address Picker for Delivery */}
              {shippingMethod === 'delivery' && (
                <div className="space-y-4">
                  <AddressPicker
                    value={shippingAddress}
                    coordinates={shippingCoordinates}
                    onChange={handleAddressChange}
                    onDistanceCalculated={handleDistanceCalculated}
                    disabled={isCreatingOrder}
                  />
                  
                  {shippingDistance > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Distance from store: {shippingDistance.toFixed(2)} km
                      {shippingDistance > (storeSettings?.shipping_radius_km || 0) && (
                        <div className="flex items-center gap-2 mt-1 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          Outside delivery radius. Please contact store for delivery options.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order Notes */}
            <div className="rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold">Additional Notes</h3>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Any special instructions for your order?"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="sticky top-6">
              {/* Order Summary */}
              <div className="rounded-xl border p-6 space-y-6">
                <h3 className="text-lg font-semibold">Order Summary</h3>
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × ฿{item.unit_price.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-medium">
                        ฿{(item.unit_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>฿{totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shippingFee === 0 ? 'Free' : `฿${shippingFee.toFixed(2)}`}</span>
                  </div>

                  {shippingMethod === 'delivery' && shippingDistance > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                      {shippingDistance.toFixed(2)} km from store
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">฿{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security & Payment */}
              <div className="rounded-xl border p-6 space-y-6 mt-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Secure Checkout</h4>
                    <p className="text-sm text-muted-foreground">
                      Your payment is protected and verified
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-3 h-3 text-green-600" />
                    </div>
                    <span>Bank transfer payment verification</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-3 h-3 text-green-600" />
                    </div>
                    <span>Thunder Solution API protection</span>
                  </div>
                </div>

                {!storeSettings?.is_store_open && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Store is currently closed</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={isCreatingOrder}
                  disabled={!storeSettings?.is_store_open || items.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingOrder ? 'Processing...' : 'Proceed to Payment'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing your purchase, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CheckoutPage
