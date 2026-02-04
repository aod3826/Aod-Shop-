import React, { useState, useEffect } from 'react'
import { Search, Filter, ShoppingBag, Star, Truck } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ProductCard from '@/components/customer/ProductCard'
import { Product } from '@/types'

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [storeStatus, setStoreStatus] = useState<{ is_open: boolean; message?: string }>({ is_open: true })

  const addToCart = useCartStore((state) => state.addItem)

  useEffect(() => {
    fetchProducts()
    fetchStoreStatus()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setProducts(data || [])
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set((data || []).map(p => p.category).filter(Boolean))
      ) as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStoreStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('is_store_open')
        .single()
      
      if (error) throw error
      
      setStoreStatus({
        is_open: data?.is_store_open || false,
        message: data?.is_store_open ? 'Store is open' : 'Store is currently closed'
      })
    } catch (error) {
      console.error('Failed to fetch store status:', error)
    }
  }

  const filterProducts = () => {
    let filtered = products
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }
    
    setFilteredProducts(filtered)
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('This product is out of stock')
      return
    }
    
    if (!storeStatus.is_open) {
      alert('Store is currently closed. Please try again later.')
      return
    }
    
    addToCart(product)
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative p-8 md:p-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Amazing Products
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Shop from our curated collection of community favorites
            </p>
            
            {/* Store Status */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${storeStatus.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {storeStatus.is_open ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium">Store Open</span>
                  <span className="text-sm">· Orders accepted</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium">Store Closed</span>
                  <span className="text-sm">· Check back later</span>
                </>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            All Products
          </button>
          
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {category}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>{filteredProducts.length} products found</span>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="py-12 flex items-center justify-center">
          <LoadingSpinner text="Loading products..." />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No products found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try a different search term' : 'Check back soon for new products!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              disabled={!storeStatus.is_open}
            />
          ))}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t">
        <div className="flex items-center gap-4 p-4 rounded-xl border">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Fast Delivery</h4>
            <p className="text-sm text-muted-foreground">
              Get your order delivered quickly within our service area
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-4 rounded-xl border">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Quality Guaranteed</h4>
            <p className="text-sm text-muted-foreground">
              All products are carefully selected for quality
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-4 rounded-xl border">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Easy Returns</h4>
            <p className="text-sm text-muted-foreground">
              Hassle-free returns within 7 days
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopPage
