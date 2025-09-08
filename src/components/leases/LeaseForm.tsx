import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { X, Calculator, Calendar } from 'lucide-react'
import { calculateEndDate, formatPeriodDuration, getPeriodLabel } from '../../lib/periodCalculations'
import { getRentLabel } from '../../lib/periodCalculations'
import { format } from 'date-fns'
import type { Tenant, Property, RpcResponse } from '../../lib/types'

interface LeaseFormProps {
  onSaved: () => void
  onCancel: () => void
}

export function LeaseForm({ onSaved, onCancel }: LeaseFormProps) {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [formData, setFormData] = useState({
    tenant_id: '',
    property_id: '',
    start_date: '',
    period_count: '',
    auto_calculate: true,
    manual_end_date: '',
    monthly_rent: '',
    security_deposit: '',
    lease_term: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchTenantsAndProperties()
    }
  }, [user])

  const fetchTenantsAndProperties = async () => {
    try {
      const [tenantsRes, propertiesRes, activeLeasesRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('landlord_id', user!.id),
        supabase.from('properties').select('*').eq('landlord_id', user!.id),
        supabase.from('leases').select('tenant_id, property_id').eq('status', 'active')
      ])

      const activeLeases = activeLeasesRes.data || []
      const activeTenantIds = new Set(activeLeases.map(lease => lease.tenant_id))
      const activePropertyIds = new Set(activeLeases.map(lease => lease.property_id))

      // Filter out tenants and properties that already have active leases
      const availableTenants = (tenantsRes.data || []).filter(tenant => !activeTenantIds.has(tenant.id))
      const availableProperties = (propertiesRes.data || []).filter(property => !activePropertyIds.has(property.id))

      setTenants(availableTenants)
      setProperties(availableProperties)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    setFormData({
      ...formData,
      property_id: propertyId,
      monthly_rent: property?.monthly_rent.toString() || ''
    })
  }

  const selectedProperty = properties.find(p => p.id === formData.property_id)
  const calculatedEndDate = formData.auto_calculate && 
    formData.start_date && 
    formData.period_count && 
    selectedProperty
    ? calculateEndDate(
        new Date(formData.start_date),
        parseInt(formData.period_count),
        selectedProperty.period_type || 'monthly'
      )
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const leaseTerms = {
        start_date: formData.start_date,
        end_date: formData.auto_calculate && calculatedEndDate
          ? calculatedEndDate.toISOString().split('T')[0]
          : formData.manual_end_date || undefined,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        period_count: formData.period_count ? parseInt(formData.period_count) : undefined,
        auto_calculate_end_date: formData.auto_calculate,
        lease_term: formData.lease_term,
        notes: formData.notes
      }

      const { data } = await supabase.rpc('create_lease', {
        p_tenant_id: formData.tenant_id,
        p_property_id: formData.property_id,
        p_lease_terms: leaseTerms 
      }) as { data: RpcResponse }

      if (data?.success) {
        onSaved()
      } else {
        setError(data?.message || 'Failed to create lease')
      }
    } catch (err) {
      console.error('Error creating lease:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Lease</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700 mb-2">
                Tenant *
              </label>
              <select
                id="tenant_id"
                required
                value={formData.tenant_id}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} {tenant.email && `(${tenant.email})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                id="property_id"
                required
                value={formData.property_id}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - ${property.monthly_rent} {getRentLabel(property.period_type || 'monthly')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                id="start_date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lease Duration
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_calculate"
                    checked={formData.auto_calculate}
                    onChange={(e) => setFormData({ ...formData, auto_calculate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="auto_calculate" className="text-sm text-gray-700">
                    Auto-calculate end date
                  </label>
                </div>

                {formData.auto_calculate ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={formData.period_count}
                        onChange={(e) => setFormData({ ...formData, period_count: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="12"
                      />
                      <span className="text-sm text-gray-600 min-w-0 flex-shrink-0">
                        {selectedProperty ? getPeriodLabel(selectedProperty.period_type || 'monthly').toLowerCase() : 'periods'}
                      </span>
                    </div>
                    
                    {calculatedEndDate && (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          Calculated end date: {format(calculatedEndDate, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    
                    {formData.period_count && selectedProperty && (
                      <div className="text-xs text-gray-500">
                        Duration: {formatPeriodDuration(
                          parseInt(formData.period_count),
                          selectedProperty.period_type || 'monthly'
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="manual_end_date" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      id="manual_end_date"
                      type="date"
                      value={formData.manual_end_date}
                      onChange={(e) => setFormData({ ...formData, manual_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="monthly_rent" className="block text-sm font-medium text-gray-700 mb-2">
                Rent Amount *
              </label>
              <input
                id="monthly_rent"
                type="number"
                step="0.01"
                required
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1200.00"
              />
              {selectedProperty && (
                <p className="text-xs text-gray-500 mt-1">
                  {getRentLabel(selectedProperty.period_type || 'monthly')}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="security_deposit" className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit
              </label>
              <input
                id="security_deposit"
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2400.00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="lease_term" className="block text-sm font-medium text-gray-700 mb-2">
              Lease Term
            </label>
            <input
              id="lease_term"
              type="text"
              value={formData.lease_term}
              onChange={(e) => setFormData({ ...formData, lease_term: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12 months, Month-to-month, etc."
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Terms & Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Special terms, conditions, or notes for this lease..."
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
              {loading ? 'Creating...' : 'Create Lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}