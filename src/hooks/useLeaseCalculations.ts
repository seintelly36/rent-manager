import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path if needed
import { differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns';
import type { LeaseWithDetails } from '../components/leases/LeasesPage'; // Adjust path
import type { Payment, RpcResponse } from '../lib/types'; // Adjust path

// It's best practice to move these types to a central types file,
// but for now, we can define them here for the hook to use.
export interface PaymentDue {
  periodNumber: number;
  dueDate: Date;
  amount: number;
  isPaid: boolean;
  paymentDate?: Date;
  paymentAmount?: number;
  isOverdue: boolean;
  isAdvance?: boolean;
}

export interface LeaseCalculations {
  totalPeriods: number;
  periodsElapsed: number;
  periodsRemaining: number;
  totalAmountDue: number;
  totalPaid: number;
  amountDue: number;
  nextDueDate: Date | null;
  daysUntilNextPayment: number;
  paymentHistory: Payment[];
  paymentDueList: PaymentDue[];
  calculatedTotalPaid: number;
  paymentRefunds: Map<string, number>;
}

/**
 * A custom hook to manage all business logic for lease details and calculations.
 * @param lease - The lease object to perform calculations on.
 */
export function useLeaseCalculations(lease: LeaseWithDetails) {
  // State for the main data and loading/error status
  const [calculations, setCalculations] = useState<LeaseCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the payment submission process
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // State for the refund submission process
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState('');

  // --- LOGIC ---

  const calculateLeaseMetrics = useCallback(async () => {
    // This logic is copied directly from your component.
    // The only change is setting the error state in the catch block.
    try {
      setLoading(true);
      setError(null);
      
      // ... (Paste the entire contents of your original `calculateLeaseMetrics` function here) ...
      // For brevity, the full calculation logic is omitted from this example block.
      // It remains exactly the same.

      // At the end of the `try` block, set calculations
      // setCalculations({ ...results... });

    } catch (err) {
      console.error('Error calculating lease metrics:', err);
      setError('Failed to load lease details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lease.id]); // Use a stable ID for the dependency

  useEffect(() => {
    calculateLeaseMetrics();
  }, [calculateLeaseMetrics]);

  // --- ACTIONS ---

  const recordPayment = async (formData: { amount: string; payment_date: string; notes: string }): Promise<RpcResponse> => {
    setIsRecordingPayment(true);
    setPaymentError('');
    try {
      const { data } = await supabase.rpc('collect_payment', {
        p_lease_id: lease.id,
        p_amount: parseFloat(formData.amount),
        p_payment_date: formData.payment_date,
        p_notes: formData.notes || null
      }) as { data: RpcResponse };

      if (data?.success) {
        await calculateLeaseMetrics(); // Recalculate on success
      } else {
        setPaymentError(data?.message || 'Failed to record payment');
      }
      return data;
    } catch (err) {
      console.error('Error recording payment:', err);
      setPaymentError('An unexpected error occurred');
      return { success: false, message: 'An unexpected error occurred' };
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const processRefund = async (formData: { payment_id: string; amount: string; reason: string }): Promise<RpcResponse> => {
    setIsProcessingRefund(true);
    setRefundError('');
    try {
      const { data } = await supabase.rpc('process_refund', {
        payment_id: formData.payment_id,
        refund_amount: parseFloat(formData.amount),
        reason: formData.reason
      }) as { data: RpcResponse };

      if (data?.success) {
        await calculateLeaseMetrics(); // Recalculate on success
      } else {
        setRefundError(data?.message || 'Failed to process refund');
      }
      return data;
    } catch (err) {
      console.error('Error processing refund:', err);
      setRefundError('An unexpected error occurred');
      return { success: false, message: 'An unexpected error occurred' };
    } finally {
      setIsProcessingRefund(false);
    }
  };


  // --- RETURN VALUE ---
  
  // Expose the state and actions for the component to use.
  return {
    calculations,
    loading,
    error,
    
    isRecordingPayment,
    paymentError,
    recordPayment,

    isProcessingRefund,
    refundError,
    processRefund,

    recalculate: calculateLeaseMetrics, // Expose a manual refresh function
  };
}