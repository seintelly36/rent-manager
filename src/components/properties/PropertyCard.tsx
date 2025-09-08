import React from 'react'
import { Edit, MapPin, DollarSign, Car, Wifi, Dumbbell } from 'lucide-react'
import { getRentLabel } from '../../lib/periodCalculations'
import type { Property } from '../../lib/types'

interface PropertyCardProps {
  property: Property
  onEdit: (property: Property) => void
  onDeleted: () => void
}

export function PropertyCard({ property, onEdit }: PropertyCardProps) {
  const amenityIcons: Record<string, React.ComponentType<any>> = {
    parking: Car,
    wifi: Wifi,
    gym: Dumbbell,
    pool: Car, // Using Car as a fallback
  }

  const getAmenityIcon = (amenity: string) => {
    const Icon = amenityIcons[amenity.toLowerCase()] || Car
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{property.address}</span>
            </div>
          </div>
          <button
            onClick={() => onEdit(property)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-xl font-semibold text-gray-900">
            ${property.monthly_rent.toLocaleString()} {getRentLabel(property.period_type || 'monthly')}
          </span>
        </div>

        {/* Property Details */}
        <div className="space-y-2">
          {property.data.square_footage && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Size:</span> {property.data.square_footage} sq ft
            </div>
          )}
          {property.data.parking_spaces && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Parking:</span> {property.data.parking_spaces} spaces
            </div>
          )}
          {property.data.amenities && Array.isArray(property.data.amenities) && property.data.amenities.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Amenities:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {property.data.amenities.map((amenity: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {getAmenityIcon(amenity)}
                    <span className="capitalize">{amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {property.data.pet_friendly && (
            <div className="text-sm text-gray-600">
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Pet Friendly
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}