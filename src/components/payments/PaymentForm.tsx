import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { X } from 'lucide-react'
import { getRentLabel } from '../../lib/periodCalculations'
import type { RpcResponse } from '../../lib/types'

interface PaymentFormProps {
  onSaved: () => void
  onCancel: () => void
}

interface LeaseWithDetails {
  id: string
  monthly_rent: number
  tenant_name: string
  property_name: string
  property_period_type: string
}

export function PaymentForm({ onSaved, onCancel }: PaymentFormProps) {
  const { user } = useAuth()
  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [formData, setFormData] = useState({
    lease_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchActiveLeases()
    }
  }, [user])

  const fetchActiveLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          monthly_rent,
          status,
          tenants!inner(name),
          properties!inner(name, landlord_id, period_type)
        `)
        .eq('status', 'active')
        .eq('properties.landlord_id', user!.id)

      if (error) throw error

      const formattedLeases = data?.map(lease => ({
        id: lease.id,
        monthly_rent: lease.monthly_rent,
        tenant_name: Array.isArray(lease.tenants) ? lease.tenants[0].name : lease.tenants.name,
        property_name: Array.isArray(lease.properties) ? lease.properties[0].name : lease.properties.name,
        property_period_type: Array.isArray(lease.properties) ? lease.properties[0].period_type : lease.properties.period_type
      })) || []

      setLeases(formattedLeases)
    } catch (error) {
      console.error('Error fetching leases:', error)
    }
  }

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId)
    setFormData({
      ...formData,
      lease_id: leaseId,
      amount: lease?.monthly_rent.toString() || ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await supabase.rpc('collect_payment', {
        p_lease_id: formData.lease_id,
        p_amount: parseFloat(formData.amount),
        p_payment_date: formData.payment_date,
        p_notes: formData.notes || null
      }) as { data: RpcResponse }

      if (data?.success) {
        onSaved()
      } else {
        setError(data?.message || 'Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="lease_id" className="block text-sm font-medium text-gray-700 mb-2">
              Lease *
            </label>
            <select
              id="lease_id"
              required
              value={formData.lease_id}
              onChange={(e) => handleLeaseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a lease</option>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenant_name} - {lease.property_name} (${lease.monthly_rent} {getRentLabel(lease.property_period_type as any || 'monthly')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1200.00"
              />
            </div>

            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                id="payment_date"
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Payment method, reference number, etc."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}