import React from 'react'
import { supabase } from '../../lib/supabase'
import type { MaintenanceRequest, Property } from '../../lib/types'
import { Building, Tag, Calendar, ChevronDown } from 'lucide-react'
import { useState } from 'react'

// Extended interface to ensure property details are included
interface MaintenanceWithDetails extends MaintenanceRequest {
  property?: Property
}

// Props interface defining what the component expects
interface MaintenanceCardProps {
  request: MaintenanceWithDetails
  onUpdated: () => void
}

// Helper function to get styling for status badges
const getStatusBadge = (status: 'pending' | 'in_progress' | 'completed') => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  }
  return styles[status] || 'bg-gray-100 text-gray-800'
}

// Helper function to get styling for priority tags
const getPriorityBadge = (priority: 'low' | 'medium' | 'high') => {
    const styles = {
        low: 'bg-gray-200 text-gray-800',
        medium: 'bg-orange-200 text-orange-800',
        high: 'bg-red-200 text-red-800',
    }
    return styles[priority] || 'bg-gray-100 text-gray-800'
}


export function MaintenanceCard({ request, onUpdated }: MaintenanceCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as MaintenanceRequest['status'];
    
    setIsUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', request.id)

      if (error) throw error

      // Call the onUpdated function passed from the parent to trigger a data refresh
      onUpdated()
    } catch (err: any) {
      setError('Failed to update status. Please try again.')
      console.error('Error updating status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Format date for better readability
  const formattedDate = new Date(request.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white shadow-md rounded-lg p-5 border border-gray-200 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-800">{request.title}</h3>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(request.priority)}`}
          >
            {request.priority}
          </span>
        </div>
        
        {/* Property Information */}
        {request.property && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Building className="w-4 h-4 mr-2" />
            <span>{request.property.name} - {request.property.address}</span>
          </div>
        )}
        
        {/* Description */}
        {request.description && (
          <p className="text-gray-600 mb-4 text-sm">{request.description}</p>
        )}
      </div>

      {/* Card Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-500 mb-3 sm:mb-0">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Reported on: {formattedDate}</span>
        </div>
        
        <div className="relative">
          <select
            value={request.status}
            onChange={handleStatusChange}
            disabled={isUpdating}
            className={`appearance-none w-full sm:w-auto text-sm font-semibold py-2 pl-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isUpdating ? 'cursor-not-allowed bg-gray-100' : 'bg-white'} ${getStatusBadge(request.status)}`}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
        </div>
      </div>
       {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}