import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { LeaseForm } from './LeaseForm'
import { LeaseCard } from './LeaseCard'
import { LeaseDetails } from './LeaseDetails'
import { Plus, Search, FileText, Filter, ArrowUpDown } from 'lucide-react'
import type { Lease, Tenant, Property, Payment } from '../../lib/types'

export interface LeaseWithDetails extends Lease {
  tenant?: Tenant
  property?: Property
  payments?: Payment[]
}

export function LeasesPage() {
  const { user } = useAuth()
  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'terminated'>('active')
  const [sortBy, setSortBy] = useState<'created_at' | 'start_date' | 'tenant_name' | 'property_name' | 'monthly_rent'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (user) {
      fetchLeases()
    }
  }, [user])

  const fetchLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          tenants!inner(id, name, email),
          properties!inner(id, name, address, landlord_id, period_type),
          payments(id, amount, payment_date, type, status, notes)
        `)
        .eq('properties.landlord_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedLeases = data?.map(lease => ({
        ...lease,
        tenant: Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants,
        property: Array.isArray(lease.properties) ? lease.properties[0] : lease.properties,
        payments: lease.payments || []
      })) || []

      setLeases(formattedLeases)
    } catch (error) {
      console.error('Error fetching leases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaseSaved = () => {
    setShowForm(false)
    fetchLeases()
  }

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property?.address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lease.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const sortedLeases = [...filteredLeases].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'tenant_name':
        aValue = a.tenant?.name || ''
        bValue = b.tenant?.name || ''
        break
      case 'property_name':
        aValue = a.property?.name || ''
        bValue = b.property?.name || ''
        break
      case 'monthly_rent':
        aValue = a.monthly_rent
        bValue = b.monthly_rent
        break
      case 'start_date':
        aValue = new Date(a.start_date)
        bValue = new Date(b.start_date)
        break
      default:
        aValue = new Date(a.created_at)
        bValue = new Date(b.created_at)
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const activeLeases = sortedLeases.filter(lease => lease.status === 'active')
  const terminatedLeases = sortedLeases.filter(lease => lease.status === 'terminated')

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
          <p className="text-gray-600">Manage lease agreements and terms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Lease
        </button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'terminated')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Leases</option>
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at">Date Created</option>
            <option value="start_date">Start Date</option>
            <option value="tenant_name">Tenant Name</option>
            <option value="property_name">Property Name</option>
            <option value="monthly_rent">Rent Amount</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Leases */}
      {(statusFilter === 'all' || statusFilter === 'active') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Leases ({activeLeases.length})
            </h2>
          </div>
          {activeLeases.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No active leases found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeLeases.map((lease) => (
                <LeaseCard
                  key={lease.id}
                  lease={lease}
                  onUpdated={fetchLeases}
                  onViewDetails={setSelectedLease}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Terminated Leases */}
      {(statusFilter === 'all' || statusFilter === 'terminated') && terminatedLeases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Terminated Leases ({terminatedLeases.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {terminatedLeases.map((lease) => (
              <LeaseCard
                key={lease.id}
                lease={lease}
                onUpdated={fetchLeases}
                onViewDetails={setSelectedLease}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-64 rounded-lg" />
          ))}
        </div>
      ) : sortedLeases.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leases found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first lease agreement'}
          </p>
        </div>
      ) : null}

      {/* Lease Form Modal */}
      {showForm && (
        <LeaseForm
          onSaved={handleLeaseSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lease Details Modal */}
      {selectedLease && (
        <LeaseDetails
          lease={selectedLease}
          onClose={() => setSelectedLease(null)}
          onUpdated={fetchLeases}
        />
      )}
    </div>
  )
}