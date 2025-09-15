import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, DollarSign, MapPin, User, XCircle, Eye, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { formatPeriodDuration, getRentLabel } from '../../../lib/periodCalculations'
import type { RpcResponse, Payment } from '../../lib/types'

interface LeaseWithDetails {
  id: string
  start_date: string
  end_date?: string | null
  monthly_rent: number
  security_deposit: number
  status: 'active' | 'terminated'
  period_count?: number | null
  auto_calculate_end_date?: boolean
  terms: Record<string, any>
  tenant?: { id: string; name: string; email?: string }
  property?: { id: string; name: string; address: string; period_type?: string }
  payments?: Payment[]
}

interface LeaseCardProps {
  lease: LeaseWithDetails
  onUpdated: () => void
  onViewDetails: (lease: LeaseWithDetails) => void
}

export function LeaseCard({ lease, onUpdated, onViewDetails }: LeaseCardProps) {
  const [terminating, setTerminating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to terminate this lease?')) return

    setTerminating(true)
    try {
      const { data } = await supabase.rpc('terminate_lease', {
        lease_id: lease.id,
        termination_date: new Date().toISOString().split('T')[0]
      }) as { data: RpcResponse }

      if (data?.success) {
        onUpdated()
      } else {
        alert(data?.message || 'Failed to terminate lease')
      }
    } catch (error) {
      console.error('Error terminating lease:', error)
      alert('Error terminating lease')
    } finally {
      setTerminating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lease? This action cannot be undone.')) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', lease.id)

      if (error) throw error
      onUpdated()
    } catch (error) {
      console.error('Error deleting lease:', error)
      alert('Error deleting lease')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                lease.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {lease.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lease.property?.name}
            </h3>
          </div>
          {lease.status === 'active' ? (
            <div className="flex space-x-2">
              <button
                onClick={() => onViewDetails(lease)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminating}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Terminate Lease"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => onViewDetails(lease)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete Lease"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{lease.tenant?.name}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{lease.property?.address}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span>
              ${lease.monthly_rent.toLocaleString()} {getRentLabel(lease.property?.period_type as any || 'monthly')}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(lease.start_date), 'MMM dd, yyyy')} - {' '}
              {lease.end_date 
                ? format(new Date(lease.end_date), 'MMM dd, yyyy')
                : 'Ongoing'
              }
            </span>
          </div>

          {lease.security_deposit > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Security Deposit:</span> ${lease.security_deposit.toLocaleString()}
            </div>
          )}

          {lease.terms.lease_term && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Term:</span> {lease.terms.lease_term}
            </div>
          )}

          {lease.period_count && lease.property?.period_type && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Duration:</span> {formatPeriodDuration(
                lease.period_count,
                lease.property.period_type as any
              )}
            </div>
          )}

          {lease.auto_calculate_end_date && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Auto-calculated lease period
            </div>
          )}
        </div>
      </div>
    </div>
  )
}