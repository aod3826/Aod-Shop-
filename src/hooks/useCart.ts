import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabaseClient'
import { useEffect } from 'react'

export const useCart = () => {
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart,
    getTotalItems,
    getTotalPrice 
  } = useCartStore()

  // Validate cart items on mount
  useEffect(() => {
    validateCartItems()
  }, [])

  const validateCartItems = async () => {
    try {
      const productIds = items.map(item => item.product_id)
      
      if (productIds.length === 0) return
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, stock, is_available')
        .in('id', productIds)
      
      if (error) throw error
      
      const availableProducts = new Set(
        products
          .filter(p => p.is_available && p.stock > 0)
          .map(p => p.id)
      )
      
      // Remove unavailable items from cart
      items.forEach(item => {
        if (!availableProducts.has(item.product_id)) {
          removeItem(item.product_id)
        }
      })
    } catch (error) {
      console.error('Failed to validate cart items:', error)
    }
  }

  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      // Check product availability
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (error || !product) {
        throw new Error('Product not found')
      }
      
      if (!product.is_available || product.stock <= 0) {
        throw new Error('Product is not available')
      }
      
      const currentQuantity = items.find(item => item.product_id === productId)?.quantity || 0
      
      if (currentQuantity + quantity > product.stock) {
        throw new Error(`Only ${product.stock} items available`)
      }
      
      addItem(product, quantity)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add to cart' 
      }
    }
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    
    updateQuantity(productId, quantity)
  }

  const getCartSummary = () => {
    return {
      totalItems: getTotalItems(),
      totalPrice: getTotalPrice(),
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      })),
    }
  }

  return {
    items,
    addToCart,
    removeItem,
    updateItemQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    getCartSummary,
  }
}
