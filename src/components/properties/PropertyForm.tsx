import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Plus, Minus } from 'lucide-react'
import { PERIOD_OPTIONS } from '../../lib/periodCalculations'
import type { Property, RpcResponse } from '../../lib/types'

interface PropertyFormProps {
  property?: Property | null
  onSaved: () => void
  onCancel: () => void
}

export function PropertyForm({ property, onSaved, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    monthly_rent: '',
    period_type: 'monthly' as const,
    square_footage: '',
    parking_spaces: '',
    pet_friendly: false,
    amenities: [''],
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        monthly_rent: property.monthly_rent.toString(),
        period_type: property.period_type || 'monthly',
        square_footage: property.data.square_footage?.toString() || '',
        parking_spaces: property.data.parking_spaces?.toString() || '',
        pet_friendly: property.data.pet_friendly || false,
        amenities: Array.isArray(property.data.amenities) && property.data.amenities.length > 0 
          ? property.data.amenities 
          : [''],
        description: property.data.description || ''
      })
    }
  }, [property])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const propertyData = {
        name: formData.name,
        address: formData.address,
        monthly_rent: formData.monthly_rent,
        period_type: formData.period_type,
        square_footage: formData.square_footage ? parseInt(formData.square_footage) : undefined,
        parking_spaces: formData.parking_spaces ? parseInt(formData.parking_spaces) : undefined,
        pet_friendly: formData.pet_friendly,
        amenities: formData.amenities.filter(a => a.trim() !== ''),
        description: formData.description
      }

      const { data } = property
        ? await supabase.rpc('update_property', {
            property_id: property.id,
            property_data: propertyData
          })
        : await supabase.rpc('create_property', {
            property_data: propertyData
          }) as { data: RpcResponse }

      if (data?.success) {
        onSaved()
      } else {
        setError(data?.message || 'Operation failed')
      }
    } catch (err) {
      console.error('Error saving property:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addAmenity = () => {
    setFormData({ ...formData, amenities: [...formData.amenities, ''] })
  }

  const removeAmenity = (index: number) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((_, i) => i !== index)
    })
  }

  const updateAmenity = (index: number, value: string) => {
    const updatedAmenities = [...formData.amenities]
    updatedAmenities[index] = value
    setFormData({ ...formData, amenities: updatedAmenities })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {property ? 'Edit Property' : 'Add New Property'}
          </h2>
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Property Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sunset Apartments Unit 2A"
              />
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
            </div>

            <div>
              <label htmlFor="period_type" className="block text-sm font-medium text-gray-700 mb-2">
                Rent Period *
              </label>
              <select
                id="period_type"
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <input
              id="address"
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 Main Street, City, State 12345"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="square_footage" className="block text-sm font-medium text-gray-700 mb-2">
                Square Footage
              </label>
              <input
                id="square_footage"
                type="number"
                value={formData.square_footage}
                onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1200"
              />
            </div>

            <div>
              <label htmlFor="parking_spaces" className="block text-sm font-medium text-gray-700 mb-2">
                Parking Spaces
              </label>
              <input
                id="parking_spaces"
                type="number"
                value={formData.parking_spaces}
                onChange={(e) => setFormData({ ...formData, parking_spaces: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.pet_friendly}
                onChange={(e) => setFormData({ ...formData, pet_friendly: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Pet Friendly</span>
            </label>
          </div>

          {/* Amenities */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Amenities
              </label>
              <button
                type="button"
                onClick={addAmenity}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={amenity}
                    onChange={(e) => updateAmenity(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="pool, gym, laundry, etc."
                  />
                  {formData.amenities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAmenity(index)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional details about the property..."
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
              {loading ? 'Saving...' : property ? 'Update Property' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}