import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Edit, Trash2, Mail, Phone, User } from 'lucide-react'
import type { Tenant, RpcResponse } from '../../lib/types'

interface TenantCardProps {
  tenant: Tenant
  onEdit: (tenant: Tenant) => void
  onDeleted: () => void
}

export function TenantCard({ tenant, onEdit, onDeleted }: TenantCardProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { data } = await supabase.rpc('delete_tenant', {
        tenant_id: tenant.id
      }) as { data: RpcResponse }

      if (data?.success) {
        onDeleted()
      } else {
        alert(data?.message || 'Failed to delete tenant')
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
      alert('Error deleting tenant')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
              {tenant.email && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{tenant.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(tenant)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display additional data */}
        <div className="space-y-2">
          {tenant.data.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{tenant.data.phone}</span>
            </div>
          )}
          {tenant.data.emergency_contact && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Emergency Contact:</span> {tenant.data.emergency_contact}
            </div>
          )}
          {tenant.data.occupation && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Occupation:</span> {tenant.data.occupation}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}