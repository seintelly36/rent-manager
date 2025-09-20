import React from 'react';
import { format } from 'date-fns';
import { RotateCcw, Printer, Download, FileImage, ChevronDown } from 'lucide-react';
import { useReceiptGenerator } from '../../../hooks/useReceiptGenerator';

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
  onReceiptAction?: (action: string, payment: Payment) => void;
}

function PaymentHistoryItem({ payment, onReceiptAction }: PaymentHistoryItemProps) {
  const [showReceiptOptions, setShowReceiptOptions] = React.useState(false);
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

  const handleReceiptAction = (action: string) => {
    if (onReceiptAction) {
      onReceiptAction(action, payment);
    }
    setShowReceiptOptions(false);
  };
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
      <div className="flex items-center space-x-2">
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
        
        {/* Receipt button for paid payments */}
        {payment.status === 'paid' && !isRefund && (
          <div className="relative">
            <button
              onClick={() => setShowReceiptOptions(!showReceiptOptions)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Receipt Options"
            >
              <Printer className="w-4 h-4" />
            </button>
            
            {showReceiptOptions && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => handleReceiptAction('print')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                >
                  <Printer className="w-3 h-3" />
                  Print
                </button>
                <button
                  onClick={() => handleReceiptAction('pdf')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-3 h-3" />
                  PDF
                </button>
                <button
                  onClick={() => handleReceiptAction('image')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                >
                  <FileImage className="w-3 h-3" />
                  Image
                </button>
              </div>
            )}
          </div>
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
  const { printReceipt, downloadReceiptPDF, downloadReceiptImage } = useReceiptGenerator();

  // If there's no history, don't render anything.
  if (!paymentHistory || paymentHistory.length === 0) {
    return null;
  }

  const handleReceiptAction = async (action: string, payment: Payment) => {
    try {
      // Convert Payment to PaymentWithDetails format
      const paymentWithDetails = {
        ...payment,
        tenant: { name: 'Tenant Name', email: 'tenant@example.com' }, // You might need to pass this data
        property: { name: 'Property Name', address: 'Property Address' } // You might need to pass this data
      };

      switch (action) {
        case 'print':
          await printReceipt(paymentWithDetails);
          break;
        case 'pdf':
          await downloadReceiptPDF(paymentWithDetails);
          break;
        case 'image':
          await downloadReceiptImage(paymentWithDetails);
          break;
      }
    } catch (error) {
      console.error(`Error with receipt ${action}:`, error);
      alert(`Failed to ${action} receipt`);
    }
  };
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
          <PaymentHistoryItem 
            key={payment.id} 
            payment={payment} 
            onReceiptAction={handleReceiptAction}
          />
        ))}
      </div>
    </div>
  );
}