import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { LeaseWithDetails } from './LeasesPage';
import { useLeaseCalculations } from '../../hooks/useLeaseCalculations'; // Ensure path is correct

// Import all the presentational components
import { LeaseInfoHeader } from './components/LeaseInfoHeader';
import { FinancialSummary } from './components/FinancialSummary';
import { PaymentSchedule } from './components/PaymentSchedule';
import { PaymentHistory } from './components/PaymentHistory';
import { LeaseTerms } from './components/LeaseTerms';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ProcessRefundModal } from './components/ProcessRefundModal';

interface LeaseDetailsProps {
  lease: LeaseWithDetails;
  onClose: () => void;
  onUpdated: () => void;
}

export function LeaseDetails({ lease, onClose, onUpdated }: LeaseDetailsProps) {
  // --- LOGIC: All business logic is now handled by the custom hook ---
  const {
    calculations,
    loading,
    error,
    isRecordingPayment,
    paymentError,
    recordPayment,
    isProcessingRefund,
    refundError,
    processRefund,
  } = useLeaseCalculations(lease);

  // --- UI STATE: This component only manages state related to the UI itself ---
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundFormData, setRefundFormData] = useState({
    payment_id: '',
    amount: '',
    reason: '',
  });

  // --- EVENT HANDLERS: Bridge the UI state with the hook's logic functions ---
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await recordPayment(paymentFormData);
    if (result?.success) {
      setShowPaymentForm(false);
      setPaymentFormData({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      onUpdated(); // Notify parent component of the update
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await processRefund(refundFormData);
    if (result?.success) {
      setShowRefundForm(false);
      setRefundFormData({ payment_id: '', amount: '', reason: '' });
      onUpdated(); // Notify parent component of the update
    }
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <h3 className="text-lg font-semibold text-red-700">An Error Occurred</h3>
          <p className="text-gray-600 mt-2">{error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Lease Details</h2>
            <p className="text-gray-600">{lease.property?.name} - {lease.tenant?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <LeaseInfoHeader
            tenantName={lease.tenant?.name}
            tenantEmail={lease.tenant?.email}
            propertyName={lease.property?.name}
            propertyAddress={lease.property?.address}
            startDate={lease.start_date}
            endDate={lease.end_date}
            periodCount={lease.period_count}
            periodType={lease.property?.period_type}
            monthlyRent={lease.monthly_rent}
            securityDeposit={lease.security_deposit}
            status={lease.status}
            autoCalculateEndDate={lease.auto_calculate_end_date}
          />

          {calculations && (
            <FinancialSummary
              calculations={calculations}
              leaseStatus={lease.status}
              onRecordPaymentClick={() => setShowPaymentForm(true)}
            />
          )}

          {calculations && <PaymentSchedule paymentDueList={calculations.paymentDueList} />}

          {calculations && (
            <PaymentHistory
              paymentHistory={calculations.paymentHistory}
              leaseStatus={lease.status}
              onProcessRefundClick={() => setShowRefundForm(true)}
            />
          )}

          <LeaseTerms terms={lease.terms} />
        </div>

        <RecordPaymentModal
          isOpen={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          onSubmit={handleRecordPaymentSubmit}
          formData={paymentFormData}
          setFormData={setPaymentFormData}
          isRecording={isRecordingPayment}
          paymentError={paymentError}
          defaultRentAmount={lease.monthly_rent}
        />

        <ProcessRefundModal
          isOpen={showRefundForm}
          onClose={() => setShowRefundForm(false)}
          onSubmit={handleRefundSubmit}
          formData={refundFormData}
          setFormData={setRefundFormData}
          isProcessing={isProcessingRefund}
          refundError={refundError}
          calculations={calculations}
        />
      </div>
    </div>
  );
}