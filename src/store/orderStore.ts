import { create } from 'zustand'
import { Order, OrderStatus } from '@/types'
import { supabase } from '@/lib/supabaseClient'

interface OrderState {
  orders: Order[]
  currentOrder: Order | null
  isLoading: boolean
  error: string | null
  filters: {
    status?: OrderStatus
    startDate?: Date
    endDate?: Date
  }
  
  // Actions
  setOrders: (orders: Order[]) => void
  setCurrentOrder: (order: Order | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<OrderState['filters']>) => void
  
  // Async Actions
  fetchOrders: (userId?: string) => Promise<void>
  fetchOrderById: (orderId: string) => Promise<void>
  createOrder: (orderData: {
    shipping_address: string
    shipping_coordinates?: { lat: number; lng: number }
    shipping_method: 'delivery' | 'pickup'
    items: Array<{
      product_id: string
      quantity: number
      unit_price: number
    }>
    payment_slip_url?: string
    trans_ref?: string
  }) => Promise<{ success: boolean; orderId?: string; error?: string }>
  
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  filters: {},
  
  setOrders: (orders) => set({ orders }),
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  
  fetchOrders: async (userId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .order('created_at', { ascending: false })
      
      // Apply filters
      const { filters } = get()
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      set({ orders: data || [] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch orders' })
      console.error('Error fetching orders:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchOrderById: async (orderId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .eq('id', orderId)
        .single()
      
      if (error) throw error
      
      set({ currentOrder: data })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch order' })
      console.error('Error fetching order:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  createOrder: async (orderData) => {
    set({ isLoading: true, error: null })
    
    try {
      const { user } = useUserStore.getState()
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Calculate total price
      const totalPrice = orderData.items.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity),
        0
      )
      
      // Get shipping fee
      const { data: storeSettings } = await supabase
        .from('store_settings')
        .select('flat_shipping_fee')
        .single()
      
      const shippingFee = orderData.shipping_method === 'delivery' 
        ? (storeSettings?.flat_shipping_fee || 0)
        : 0
      
      // Call RPC function for atomic transaction
      const { data, error } = await supabase.rpc('place_order_complete', {
        p_user_id: user.id,
        p_shipping_address: orderData.shipping_address,
        p_shipping_coordinates: orderData.shipping_coordinates 
          ? `POINT(${orderData.shipping_coordinates.lng} ${orderData.shipping_coordinates.lat})`
          : null,
        p_total_price: totalPrice,
        p_shipping_fee: shippingFee,
        p_order_items: orderData.items,
        p_payment_slip_url: orderData.payment_slip_url,
        p_trans_ref: orderData.trans_ref
      })
      
      if (error) throw error
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create order')
      }
      
      // Clear cart after successful order
      useCartStore.getState().clearCart()
      
      return { 
        success: true, 
        orderId: data.order_id 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
      set({ error: errorMessage })
      
      // Log error to activity logs
      await supabase.from('activity_logs').insert({
        action_type: 'ORDER_CREATE_ERROR',
        error_message: errorMessage,
        created_at: new Date().toISOString()
      })
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    set({ isLoading: true, error: null })
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
      
      if (error) throw error
      
      // Update local state
      set((state) => ({
        orders: state.orders.map(order =>
          order.id === orderId ? { ...order, status } : order
        ),
        currentOrder: state.currentOrder?.id === orderId 
          ? { ...state.currentOrder, status }
          : state.currentOrder
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update order status' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },
  
  cancelOrder: async (orderId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Only allow cancellation if order is still pending
      if (order.status !== 'pending') {
        throw new Error('Cannot cancel order in current status')
      }
      
      // Restore stock
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)
      
      if (itemsError) throw itemsError
      
      // Update product stock for each item
      for (const item of items) {
        await supabase.rpc('increment_product_stock', {
          product_id: item.product_id,
          increment: item.quantity
        })
      }
      
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
      
      if (updateError) throw updateError
      
      // Update local state
      set((state) => ({
        orders: state.orders.filter(order => order.id !== orderId),
        currentOrder: null
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel order' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },
}))
