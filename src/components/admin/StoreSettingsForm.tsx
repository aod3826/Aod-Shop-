import React, { useState, useEffect } from 'react'
import { Save, MapPin, Package, Bell, Lock, Globe } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '../common/LoadingSpinner'
import Button from '../common/Button'
import toast from 'react-hot-toast'

const storeSettingsSchema = z.object({
  store_name: z.string().min(1, 'Store name is required'),
  store_address: z.string().optional(),
  store_lat: z.coerce.number().optional(),
  store_lng: z.coerce.number().optional(),
  flat_shipping_fee: z.coerce.number().min(0, 'Shipping fee cannot be negative'),
  shipping_radius_km: z.coerce.number().min(0, 'Radius cannot be negative'),
  is_store_open: z.boolean(),
  line_notify_token: z.string().optional(),
  line_notify_user_id: z.string().optional(),
})

type StoreSettingsFormData = z.infer<typeof storeSettingsSchema>

const StoreSettingsForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreSettingsFormData>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      store_name: 'Mini Shop',
      flat_shipping_fee: 0,
      shipping_radius_km: 10,
      is_store_open: true,
    },
  })

  const isStoreOpen = watch('is_store_open')

  useEffect(() => {
    fetchStoreSettings()
  }, [])

  const fetchStoreSettings = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single()
      
      if (error) throw error
      
      if (data) {
        setValue('store_name', data.store_name || '')
        setValue('store_address', data.store_address || '')
        setValue('flat_shipping_fee', data.flat_shipping_fee || 0)
        setValue('shipping_radius_km', data.shipping_radius_km || 10)
        setValue('is_store_open', data.is_store_open || false)
        setValue('line_notify_token', data.line_notify_token || '')
        setValue('line_notify_user_id', data.line_notify_user_id || '')
        
        if (data.store_coordinates) {
          const coords = data.store_coordinates as any
          const lat = coords.coordinates[1]
          const lng = coords.coordinates[0]
          setValue('store_lat', lat)
          setValue('store_lng', lng)
          setStoreLocation({ lat, lng })
        }
      }
    } catch (error) {
      console.error('Failed to fetch store settings:', error)
      toast.error('Failed to load store settings')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: StoreSettingsFormData) => {
    try {
      setIsSaving(true)
      
      const storeCoordinates = data.store_lat && data.store_lng
        ? `POINT(${data.store_lng} ${data.store_lat})`
        : null
      
      const updates = {
        store_name: data.store_name,
        store_address: data.store_address,
        store_coordinates: storeCoordinates,
        flat_shipping_fee: data.flat_shipping_fee,
        shipping_radius_km: data.shipping_radius_km,
        is_store_open: data.is_store_open,
        line_notify_token: data.line_notify_token || null,
        line_notify_user_id: data.line_notify_user_id || null,
        updated_at: new Date().toISOString(),
      }
      
      const { error } = await supabase
        .from('store_settings')
        .update(updates)
        .eq('id', '00000000-0000-0000-0000-000000000001')
      
      if (error) throw error
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action_type: 'STORE_SETTINGS_UPDATED',
        table_name: 'store_settings',
        new_data: updates,
        created_at: new Date().toISOString(),
      })
      
      toast.success('Store settings updated successfully')
    } catch (error) {
      console.error('Failed to update store settings:', error)
      toast.error('Failed to update store settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setValue('store_lat', latitude)
        setValue('store_lng', longitude)
        setStoreLocation({ lat: latitude, lng: longitude })
        toast.success('Location updated')
      },
      (error) => {
        console.error('Geolocation error:', error)
        toast.error('Unable to get your location')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner text="Loading store settings..." />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Store Information */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Store Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Store Name *
            </label>
            <input
              type="text"
              {...register('store_name')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.store_name && (
              <p className="mt-1 text-sm text-destructive">
                {errors.store_name.message}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Flat Shipping Fee (฿) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('flat_shipping_fee')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.flat_shipping_fee && (
              <p className="mt-1 text-sm text-destructive">
                {errors.flat_shipping_fee.message}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Shipping Radius (km) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              {...register('shipping_radius_km')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.shipping_radius_km && (
              <p className="mt-1 text-sm text-destructive">
                {errors.shipping_radius_km.message}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Store Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_store_open')}
                  className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
                />
                <span className="text-sm">
                  Store is {isStoreOpen ? 'Open' : 'Closed'}
                </span>
              </label>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${isStoreOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isStoreOpen ? 'Accepting Orders' : 'Not Accepting Orders'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Location */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Store Location</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Store Address
            </label>
            <textarea
              {...register('store_address')}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Enter store address for delivery calculations"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                {...register('store_lat')}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="13.736717"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                {...register('store_lng')}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="100.523186"
              />
            </div>
          </div>
          
          {storeLocation && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              Current coordinates: {storeLocation.lat.toFixed(6)}, {storeLocation.lng.toFixed(6)}
            </div>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>
        </div>
      </div>

      {/* LINE Integration */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">LINE Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              LINE Notify Token
            </label>
            <input
              type="password"
              {...register('line_notify_token')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter LINE Notify token for admin notifications"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Get token from <a href="https://notify-bot.line.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LINE Notify</a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              LINE Notify User ID
            </label>
            <input
              type="text"
              {...register('line_notify_user_id')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Optional: Specific user ID for notifications"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-6 border-t">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Changes are saved to the database immediately
          </div>
          
          <Button
            type="submit"
            loading={isSaving}
            className="min-w-[120px]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  )
}

export default StoreSettingsForm
