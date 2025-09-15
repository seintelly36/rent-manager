import React from 'react';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';

// This 'Payment' type should ideally be imported from a central types file (e.g., '@/lib/types')
// It defines the shape of a single payment object.
export interface Payment {
  id: string;
  type: 'rent' | 'refund' | string;
  status: 'paid' | 'pending' | 'failed' | string;
  amount: number;
  payment_date: string | Date;
  notes?: string | null;
}

interface PaymentHistoryProps {
  paymentHistory: Payment[];
  leaseStatus: 'active' | 'terminated' | string;
  onProcessRefundClick: () => void;
}

// --- Sub-component for a single list item ---

interface PaymentHistoryItemProps {
  payment: Payment;
}

function PaymentHistoryItem({ payment }: PaymentHistoryItemProps) {
  const isRefund = payment.type === 'refund';
  
  // Dynamic classes for styling based on payment status and type
  const containerClasses = isRefund
    ? 'bg-red-50 border border-red-200'
    : 'bg-gray-50';
    
  const statusDotClasses = {
    paid: 'bg-green-500',
    pending: 'bg-yellow-500',
    failed: 'bg-red-500',
  }[payment.status] || 'bg-gray-400';

  const statusBadgeClasses = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }[payment.status] || 'bg-gray-100 text-gray-800';

  return (
    <div
      key={payment.id}
      className={`flex items-center justify-between p-4 rounded-lg ${containerClasses}`}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${statusDotClasses}`} />
        <div>
          <p className="font-medium text-gray-900">
            {isRefund ? '-$' : '$'}{Math.abs(payment.amount).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            {format(new Date(payment.payment_date), 'MMM dd, yyyy')} • {payment.type}
          </p>
          {payment.notes && (
            <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end space-y-1">
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusBadgeClasses}`}>
          {payment.status}
        </span>
        {isRefund && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            REFUND
          </span>
        )}
      </div>
    </div>
  );
}


// --- Main Exported Component ---

/**
 * A component that displays a scrollable list of historical payment
 * and refund transactions for a lease.
 */
export function PaymentHistory({ paymentHistory, leaseStatus, onProcessRefundClick }: PaymentHistoryProps) {
  // If there's no history, don't render anything.
  if (!paymentHistory || paymentHistory.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
        {leaseStatus === 'active' && (
          <button
            onClick={onProcessRefundClick}
            className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Process Refund
          </button>
        )}
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {paymentHistory.map((payment) => (
          <PaymentHistoryItem key={payment.id} payment={payment} />
        ))}
      </div>
    </div>
  );
}