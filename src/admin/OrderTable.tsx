import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, Eye, Truck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useOrderStore } from '@/store/orderStore'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import LoadingSpinner from '../common/LoadingSpinner'
import Button from '../common/Button'
import { Order, OrderStatus } from '@/types'

const OrderTable: React.FC = () => {
  const { orders, isLoading, filters, setFilters, fetchOrders, updateOrderStatus } = useOrderStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [filters])

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  const handleExport = () => {
    // Export logic here
    const csvContent = orders.map(order => 
      `${order.order_number},${order.status},${order.total_price},${order.created_at}`
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !selectedStatus || order.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipping: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    problem: 'bg-orange-100 text-orange-800',
  }

  const statusIcons: Record<OrderStatus, React.ReactNode> = {
    pending: <AlertCircle className="w-4 h-4" />,
    paid: <CheckCircle className="w-4 h-4" />,
    processing: <Eye className="w-4 h-4" />,
    shipping: <Truck className="w-4 h-4" />,
    delivered: <CheckCircle className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
    problem: <AlertCircle className="w-4 h-4" />,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-muted-foreground">
            {filteredOrders.length} orders found
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order number or address..."
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg bg-background text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | '')}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipping">Shipping</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="problem">Problem</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  onChange={(e) => setFilters({ startDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm"
                />
                <input
                  type="date"
                  onChange={(e) => setFilters({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setSelectedStatus('')
                setFilters({})
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <LoadingSpinner text="Loading orders..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(filteredOrders.map(o => o.id))
                        } else {
                          setSelectedOrders([])
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders([...selectedOrders, order.id])
                          } else {
                            setSelectedOrders(selectedOrders.filter(id => id !== order.id))
                          }
                        }}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {order.shipping_address}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {order.user_id ? 'Customer' : 'Guest'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">
                        ฿{(order.total_price + order.shipping_fee).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusIcons[order.status]}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Navigate to order detail
                            window.location.href = `/admin/orders/${order.id}`
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {order.status === 'paid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'processing')}
                          >
                            Mark as Processing
                          </Button>
                        )}
                        
                        {order.status === 'processing' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'shipping')}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Ship
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedOrders.length} orders selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk update to processing
                  selectedOrders.forEach(orderId => {
                    handleStatusUpdate(orderId, 'processing')
                  })
                  setSelectedOrders([])
                }}
              >
                Mark as Processing
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  // Bulk cancel
                  selectedOrders.forEach(orderId => {
                    handleStatusUpdate(orderId, 'cancelled')
                  })
                  setSelectedOrders([])
                }}
              >
                Cancel Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTable
