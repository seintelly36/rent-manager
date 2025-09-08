import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PaymentForm } from './PaymentForm'
import { PaymentCard } from './PaymentCard'
import { Plus, Search, CreditCard, Filter } from 'lucide-react'
import type { Payment } from '../../lib/types'

interface PaymentWithDetails extends Payment {
  tenant?: { name: string; email?: string }
  property?: { name: string; address: string; period_type?: string }
  refunded_amount?: number
  is_refunded?: boolean
}

export function PaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'rent' | 'deposit' | 'refund'>('all')

  useEffect(() => {
    if (user) {
      fetchPayments()
    }
  }, [user])

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner(
            id,
            tenants!inner(name, email),
            properties!inner(name, address, landlord_id, period_type)
          )
        `)
        .eq('leases.properties.landlord_id', user!.id)
        .order('payment_date', { ascending: false })

      if (error) throw error

      const formattedPayments = data?.map(payment => {
        // Calculate refunded amount and status
        const refunds = data?.filter(p => 
          p.type === 'refund' && 
          p.notes?.includes(payment.id) && 
          p.status === 'paid'
        ) || []
        
        const refunded_amount = refunds.reduce((sum, refund) => sum + Math.abs(refund.amount), 0)
        const is_refunded = refunded_amount > 0

        return {
          ...payment,
          tenant: Array.isArray(payment.leases.tenants) ? payment.leases.tenants[0] : payment.leases.tenants,
          property: Array.isArray(payment.leases.properties) ? payment.leases.properties[0] : payment.leases.properties,
          refunded_amount,
          is_refunded
        }
      }) || []

      setPayments(formattedPayments)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSaved = () => {
    setShowForm(false)
    fetchPayments()
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === 'all' || payment.type === typeFilter

    return matchesSearch && matchesType
  })
console.log('Payments state (raw, before filter):', payments); // <-- Add this
console.log('Current searchTerm:', searchTerm); // <-- Add this
console.log('Current typeFilter:', typeFilter); // <-- Add this
  const totalRevenue = payments
    .filter(p => p.type !== 'refund' && p.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const totalRefunds = payments
    .filter(p => p.type === 'refund' && p.status === 'paid')
    .reduce((sum, payment) => sum + Math.abs(payment.amount), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track rent payments and manage refunds</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Refunds</p>
              <p className="text-2xl font-semibold text-gray-900">${totalRefunds.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-semibold text-gray-900">${(totalRevenue - totalRefunds).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'rent' | 'deposit' | 'refund')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="rent">Rent</option>
          <option value="deposit">Deposit</option>
          <option value="refund">Refund</option>
        </select>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-lg" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Record your first payment'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
  return ( // The 'return' keyword is needed with curly braces
    <PaymentCard
      key={payment.id}
      payment={payment}
      onUpdated={fetchPayments}
    />
  )
})} 
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <PaymentForm
          onSaved={handlePaymentSaved}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}