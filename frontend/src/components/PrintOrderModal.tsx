import React, { useState, useEffect } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'

interface PrintOrderModalProps {
  bookId: number
  bookName: string
  onClose: () => void
  onOrderCreated?: (orderId: number) => void
}

interface ShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state_code: string
  postcode: string
  country_code: string
  phone_number: string
}

interface CostBreakdown {
  total_cost_incl_tax: string
  total_cost_excl_tax: string
  total_tax: string
  shipping_cost: {
    total_cost_incl_tax: string
  }
}

const PrintOrderModal: React.FC<PrintOrderModalProps> = ({
  bookId,
  bookName,
  onClose,
  onOrderCreated,
}) => {
  const { getToken } = useClerkAuth()
  const [step, setStep] = useState<'form' | 'quote' | 'confirm' | 'success'>(
    'form'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [shippingName, setShippingName] = useState('')
  const [street1, setStreet1] = useState('')
  const [street2, setStreet2] = useState('')
  const [city, setCity] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [postcode, setPostcode] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [shippingLevel, setShippingLevel] = useState('MAIL')

  // Quote state
  const [quote, setQuote] = useState<any>(null)

  // Order result
  const [orderId, setOrderId] = useState<number | null>(null)

  const shippingLevels = [
    {
      value: 'MAIL',
      label: 'Standard Mail',
      description: 'Slowest, most economical',
    },
    {
      value: 'PRIORITY_MAIL',
      label: 'Priority Mail',
      description: 'Faster delivery',
    },
    {
      value: 'GROUND',
      label: 'Ground',
      description: 'Courier ground shipping',
    },
    { value: 'EXPEDITED', label: 'Expedited', description: '2-day delivery' },
    { value: 'EXPRESS', label: 'Express', description: 'Overnight delivery' },
  ]

  const getQuote = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(
        `http://localhost:8000/api/books/${bookId}/print-quote?country_code=${countryCode}&state_code=${stateCode}&city=${city}&postcode=${postcode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get quote')
      }

      const data = await response.json()
      setQuote(data)
      setStep('quote')
    } catch (err: any) {
      setError(err.message || 'Failed to get quote')
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()

      const shippingAddress: ShippingAddress = {
        name: shippingName,
        street1,
        street2: street2 || undefined,
        city,
        state_code: stateCode,
        postcode,
        country_code: countryCode,
        phone_number: phoneNumber,
      }

      const response = await fetch(
        `http://localhost:8000/api/books/${bookId}/print-order`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipping_name: shippingName,
            shipping_address: shippingAddress,
            shipping_level: shippingLevel,
            contact_email: email,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create order')
      }

      const data = await response.json()
      setOrderId(data.order_id)
      setStep('success')

      if (onOrderCreated) {
        onOrderCreated(data.order_id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (
      !shippingName ||
      !street1 ||
      !city ||
      !postcode ||
      !phoneNumber ||
      !email
    ) {
      setError('Please fill in all required fields')
      return
    }

    getQuote()
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shipping Information</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={shippingName}
              onChange={e => setShippingName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+1 555-0100"
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Street Address *
            </label>
            <input
              type="text"
              value={street1}
              onChange={e => setStreet1(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Apartment, Suite, etc. (optional)
            </label>
            <input
              type="text"
              value={street2}
              onChange={e => setStreet2(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                State/Province
              </label>
              <input
                type="text"
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
                placeholder="NY"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Postal Code *
              </label>
              <input
                type="text"
                value={postcode}
                onChange={e => setPostcode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Country *
              </label>
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Shipping Speed</h3>
        <div className="space-y-2">
          {shippingLevels.map(level => (
            <label
              key={level.value}
              className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="shippingLevel"
                value={level.value}
                checked={shippingLevel === level.value}
                onChange={e => setShippingLevel(e.target.value)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">{level.label}</div>
                <div className="text-sm text-gray-600">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Getting Quote...' : 'Get Quote'}
        </button>
      </div>
    </form>
  )

  const renderQuote = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Price Quote</h3>

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span>Book:</span>
          <span className="font-medium">{bookName}</span>
        </div>
        <div className="flex justify-between">
          <span>Pages (estimated):</span>
          <span className="font-medium">
            {quote?.estimated_page_count || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Binding:</span>
          <span className="font-medium">Coil (stays flat when open)</span>
        </div>
        <div className="flex justify-between">
          <span>Quantity:</span>
          <span className="font-medium">1</span>
        </div>
      </div>

      {quote?.cost_breakdown && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>Print Cost:</span>
            <span>${quote.cost_breakdown.total_cost_excl_tax}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping ({shippingLevel}):</span>
            <span>
              $
              {quote.cost_breakdown.shipping_cost?.total_cost_incl_tax ||
                '0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${quote.cost_breakdown.total_tax || '0.00'}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${quote.cost_breakdown.total_cost_incl_tax}</span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded-lg text-sm">
        <p className="font-medium mb-1">📦 What happens next:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Your order will be sent to Lulu for printing</li>
          <li>You'll receive tracking information when it ships</li>
          <li>Delivery time depends on shipping method selected</li>
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep('form')}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Back
        </button>
        <button
          onClick={createOrder}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating Order...' : 'Confirm Order'}
        </button>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="text-center space-y-4 py-6">
      <div className="text-6xl">✅</div>
      <h3 className="text-xl font-bold text-green-600">Order Created!</h3>
      <p className="text-gray-600">
        Your cookbook has been sent to the printer.
      </p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Order ID</p>
        <p className="font-mono font-bold">#{orderId}</p>
      </div>
      <p className="text-sm text-gray-600">
        You can track your order status in the Print Orders section.
      </p>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Close
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">📦 Order Printed Book</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {step === 'form' && renderForm()}
          {step === 'quote' && renderQuote()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  )
}

export default PrintOrderModal

