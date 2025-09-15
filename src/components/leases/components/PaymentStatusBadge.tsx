import React from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface PaymentStatusBadgeProps {
  isPaid: boolean;
  isOverdue: boolean;
  isAdvance?: boolean;
}

/**
 * Displays a status badge for a payment (Paid, Overdue, Pending)
 * and an optional "Advance" badge.
 */
export function PaymentStatusBadge({ isPaid, isOverdue, isAdvance }: PaymentStatusBadgeProps) {
  return (
    <div className="flex items-center space-x-2">
      {isPaid ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </span>
      ) : isOverdue ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      )}
      {isAdvance && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Advance
        </span>
      )}
    </div>
  );
}