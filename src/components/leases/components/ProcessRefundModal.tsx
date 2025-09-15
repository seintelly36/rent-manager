import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Payment } from '../../lib/types'; // Adjust path as needed

// Define the shape of the form data object
interface RefundFormData {
  payment_id: string;
  amount: string;
  reason: string;
}

// Define the shape of the required calculation data
interface RefundCalculations {
  paymentHistory: Payment[];
  paymentRefunds: Map<string, number>;
}

// Define the props the modal will accept
interface ProcessRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;

  formData: RefundFormData;
  setFormData: (formData: RefundFormData) => void;

  isProcessing: boolean;
  refundError: string;
  calculations: RefundCalculations | null;
}

/**
 * A modal component for processing a refund against a specific payment.
 * This is a fully controlled component; all state and submission logic
 * is managed by the parent.
 */
export function ProcessRefundModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isProcessing,
  refundError,
  calculations,
}: ProcessRefundModalProps) {
  // If the modal is not open or we don't have calculation data, render nothing.
  if (!isOpen || !calculations) {
    return null;
  }
  
  // Memoize the list of refundable payments to avoid re-filtering on every render
  const refundablePayments = React.useMemo(() => {
    return calculations.paymentHistory.filter(p => {
      if (p.type !== 'rent' || p.status !== 'paid') return false;
      const refundedAmount = calculations.paymentRefunds.get(p.id) || 0;
      return refundedAmount < p.amount; // Only show if not fully refunded
    });
  }, [calculations.paymentHistory, calculations.paymentRefunds]);

  // Handler for when the user selects a different payment to refund
  const handlePaymentSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const paymentId = e.target.value;
    const payment = calculations.paymentHistory.find(p => p.id === paymentId);
    const refundedAmount = calculations.paymentRefunds.get(paymentId) || 0;
    const maxRefund = payment ? payment.amount - refundedAmount : 0;
    setFormData({
      ...formData,
      payment_id: paymentId,
      amount: maxRefund > 0 ? maxRefund.toString() : ''
    });
  };

  // Helper function to calculate max refund for the selected payment
  const getMaxRefund = () => {
    if (!formData.payment_id || !calculations.paymentRefunds) return undefined;
    const payment = calculations.paymentHistory.find(p => p.id === formData.payment_id);
    const refundedAmount = calculations.paymentRefunds.get(formData.payment_id) || 0;
    return payment ? payment.amount - refundedAmount : undefined;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Process Refund</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {refundError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{refundError}</div>
          )}

          <div>
            <label htmlFor="refund_payment" className="block text-sm font-medium text-gray-700 mb-2">
              Select Payment to Refund *
            </label>
            <select
              id="refund_payment"
              required
              value={formData.payment_id}
              onChange={handlePaymentSelectionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a payment</option>
              {refundablePayments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  ${payment.amount} - {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-2">
              Refund Amount *
            </label>
            {formData.payment_id && (
              <div className="mb-2 text-sm text-gray-600">
                Max Refund: ${getMaxRefund()?.toLocaleString() ?? 0}
              </div>
            )}
            <input
              id="refund_amount"
              type="number"
              step="0.01"
              min="0.01"
              max={getMaxRefund()}
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="refund_reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Refund *
            </label>
            <textarea
              id="refund_reason"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Reason for processing this refund..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}