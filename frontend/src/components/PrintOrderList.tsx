import React, { useState, useEffect } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import Navigation from './Navigation'

interface PrintOrder {
  id: number
  book_id: number
  book_name: string
  lulu_job_id: string
  status: string
  shipping_name: string
  shipping_level: string
  total_cost: string | null
  tracking_id: string | null
  tracking_url: string | null
  carrier_name: string | null
  created_at: string
  updated_at: string
}

const PrintOrderList: React.FC = () => {
  const { getToken } = useClerkAuth()
  const [orders, setOrders] = useState<PrintOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<number | null>(null)

  const fetchOrders = async () => {
    try {
      const token = await getToken()
      const response = await fetch('http://localhost:8000/api/print-orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const refreshOrderStatus = async (orderId: number) => {
    setRefreshing(orderId)
    try {
      const token = await getToken()
      const response = await fetch(
        `http://localhost:8000/api/print-orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to refresh order status')
      }

      const updatedOrder = await response.json()

      // Update the order in the list
      setOrders(
        orders.map(order => (order.id === orderId ? updatedOrder : order))
      )
    } catch (err: any) {
      console.error('Failed to refresh order:', err)
    } finally {
      setRefreshing(null)
    }
  }

  useEffect(() => {
    fetchOrders()

    // Auto-refresh every 30 seconds for active orders
    const interval = setInterval(() => {
      const hasActiveOrders = orders.some(
        order => !['SHIPPED', 'CANCELED', 'REJECTED'].includes(order.status)
      )

      if (hasActiveOrders) {
        fetchOrders()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; label: string; icon: string }
    > = {
      CREATED: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Created',
        icon: '📝',
      },
      UNPAID: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Unpaid',
        icon: '💳',
      },
      PAYMENT_IN_PROGRESS: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Processing Payment',
        icon: '⏳',
      },
      PRODUCTION_DELAYED: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Production Delayed',
        icon: '⏸️',
      },
      PRODUCTION_READY: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Production Ready',
        icon: '✅',
      },
      IN_PRODUCTION: {
        color: 'bg-blue-100 text-blue-800',
        label: 'In Production',
        icon: '🖨️',
      },
      SHIPPED: {
        color: 'bg-green-100 text-green-800',
        label: 'Shipped',
        icon: '📦',
      },
      CANCELED: {
        color: 'bg-red-100 text-red-800',
        label: 'Canceled',
        icon: '❌',
      },
      REJECTED: {
        color: 'bg-red-100 text-red-800',
        label: 'Rejected',
        icon: '⚠️',
      },
    }

    const config = statusConfig[status] || {
      color: 'bg-gray-100 text-gray-800',
      label: status,
      icon: '❓',
    }

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      >
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getShippingLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      MAIL: 'Standard Mail',
      PRIORITY_MAIL: 'Priority Mail',
      GROUND: 'Ground',
      EXPEDITED: 'Expedited (2-day)',
      EXPRESS: 'Express (Overnight)',
    }
    return labels[level] || level
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )
    }

    if (orders.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No Print Orders Yet</h3>
          <p className="text-gray-600">
            Order a printed version of your cookbook to see it here.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Print Orders</h2>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {order.book_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Order #{order.id} • Lulu Job #{order.lulu_job_id}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Recipient</p>
                  <p className="font-medium">{order.shipping_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shipping Method</p>
                  <p className="font-medium">
                    {getShippingLevelLabel(order.shipping_level)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
                {order.total_cost && (
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="font-medium">{order.total_cost}</p>
                  </div>
                )}
              </div>

              {order.tracking_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    📦 Tracking Information
                  </p>
                  <div className="space-y-1">
                    {order.carrier_name && (
                      <p className="text-sm text-gray-700">
                        Carrier:{' '}
                        <span className="font-medium">
                          {order.carrier_name}
                        </span>
                      </p>
                    )}
                    <p className="text-sm text-gray-700">
                      Tracking ID:{' '}
                      <span className="font-mono font-medium">
                        {order.tracking_id}
                      </span>
                    </p>
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Track Package →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => refreshOrderStatus(order.id)}
                  disabled={refreshing === order.id}
                  className="px-4 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                >
                  {refreshing === order.id
                    ? '⏳ Refreshing...'
                    : '🔄 Update Status'}
                </button>

                {order.status === 'SHIPPED' && order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded-lg"
                  >
                    📦 Track Package
                  </a>
                )}
              </div>

              {order.status === 'REJECTED' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    ⚠️ This order was rejected. Please contact support for more
                    information.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Orders are automatically updated every 30
            seconds while active. You can also manually refresh any order to get
            the latest status.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navigation />
      <div
        style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default PrintOrderList

