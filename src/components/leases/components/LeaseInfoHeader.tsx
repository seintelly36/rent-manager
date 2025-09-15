import React from 'react';
import { User, MapPin, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriodDuration, getRentLabel } from '../../../lib/periodCalculations'; // Adjust path if needed

// Define the props (arguments) that this component will accept
interface LeaseInfoHeaderProps {
  tenantName?: string;
  tenantEmail?: string;
  propertyName?: string;
  propertyAddress?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  periodCount?: number | null;
  periodType?: string | null;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'terminated' | string;
  autoCalculateEndDate: boolean;
}

/**
 * A component dedicated to displaying the primary information and status of a lease.
 * It is a "pure" presentational component that receives all data as individual props.
 */
export function LeaseInfoHeader({
  tenantName,
  tenantEmail,
  propertyName,
  propertyAddress,
  startDate,
  endDate,
  periodCount,
  periodType,
  monthlyRent,
  securityDeposit,
  status,
  autoCalculateEndDate,
}: LeaseInfoHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Lease Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Lease Information</h3>

        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">{tenantName}</p>
            <p className="text-sm text-gray-600">{tenantEmail}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">{propertyName}</p>
            <p className="text-sm text-gray-600">{propertyAddress}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">
              {format(new Date(startDate), 'MMM dd, yyyy')} - {' '}
              {endDate
                ? format(new Date(endDate), 'MMM dd, yyyy')
                : 'Ongoing'
              }
            </p>
            <p className="text-sm text-gray-600">
              {periodCount && periodType && (
                <>Duration: {formatPeriodDuration(periodCount, periodType as any)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">
              ${monthlyRent.toLocaleString()} {getRentLabel(periodType as any || 'monthly')}
            </p>
            {securityDeposit > 0 && (
              <p className="text-sm text-gray-600">
                Security Deposit: ${securityDeposit.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Status</h3>
        <div className="space-y-3">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {status === 'active' ? 'Active Lease' : 'Terminated'}
          </span>

          {autoCalculateEndDate && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600">Auto-calculated lease period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}