import React from 'react';
import { format } from 'date-fns';
import { PaymentStatusBadge } from './PaymentStatusBadge'; // Adjust path as needed

// This type should be imported from your custom hook or a central types file
// It defines the shape of a single item in the paymentDueList array.
export interface PaymentDue {
  periodNumber: number;
  dueDate: Date;
  amount: number;
  isPaid: boolean;
  isOverdue: boolean;
  isAdvance?: boolean;
  paymentDate?: Date;
  paymentAmount?: number;
}

interface PaymentScheduleProps {
  paymentDueList: PaymentDue[];
}

/**
 * A component that displays a complete, scrollable table of all
 * expected payment periods for a lease.
 */
export function PaymentSchedule({ paymentDueList }: PaymentScheduleProps) {
  // Helper to determine the row's background color based on its status
  const getRowClassName = (due: PaymentDue) => {
    if (due.isOverdue) return 'bg-red-50';
    if (due.isAdvance) return 'bg-indigo-50';
    if (due.isPaid) return 'bg-green-50';
    return 'bg-white';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment Schedule</h3>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentDueList.map((due) => (
                <tr key={due.periodNumber} className={getRowClassName(due)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Period {due.periodNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(due.dueDate, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${due.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PaymentStatusBadge
                      isPaid={due.isPaid}
                      isOverdue={due.isOverdue}
                      isAdvance={due.isAdvance}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {due.paymentDate ? (
                      <div>
                        <div>{format(due.paymentDate, 'MMM dd, yyyy')}</div>
                        {due.paymentAmount && due.paymentAmount !== due.amount && (
                          <div className="text-xs text-gray-500">
                            (${due.paymentAmount.toLocaleString()})
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}