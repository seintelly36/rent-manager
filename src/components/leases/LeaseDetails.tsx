// src/components/LeaseDetails.tsx

import React from 'react'
import { X } from 'lucide-react'

// Import the new hook and its types
import { useLeaseCalculations, LeaseCalculations, PaymentDue } from '../../hooks/useLeaseCalculations'; 

import type { LeaseWithDetails } from './LeasesPage'
import { LeaseInfoHeader } from './components/LeaseInfoHeader';
import { FinancialSummary } from './components/FinancialSummary'; 
import { PaymentSchedule } from './components/PaymentSchedule';
import { PaymentHistory } from './components/PaymentHistory';
import { LeaseTerms } from './components/LeaseTerms';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ProcessRefundModal } from './components/ProcessRefundModal';

interface LeaseDetailsProps {
  lease: LeaseWithDetails
  onClose: () => void
  onUpdated: () => void
}

export function LeaseDetails({ lease, onClose, onUpdated }: LeaseDetailsProps) {
  // All logic is now contained within this single hook call
  const {
    loading,
    calculations,
    showPaymentForm,
    paymentFormData,
    recordingPayment,
    paymentError,
    setPaymentFormData,
    handleRecordPayment,
    openPaymentModal,
    closePaymentModal,
    showRefundForm,
    refundFormData,
    processingRefund,
    refundError,
    setRefundFormData,
    handleRefund,
    openRefundModal,
    closeRefundModal,
  } = useLeaseCalculations(lease, onUpdated);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="animate-pulse space-y-4">
            {/* Skeleton Loader UI remains the same */}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Lease Details</h2>
            <p className="text-gray-600">{lease.property?.name} - {lease.tenant?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <LeaseInfoHeader
            tenantName={lease.tenant?.name}
            tenantEmail={lease.tenant?.email}
            propertyName={lease.property?.name}
            // ... other props
          />

          {calculations && (
             <FinancialSummary
                calculations={calculations}
                leaseStatus={lease.status}
                onRecordPaymentClick={openPaymentModal} // Use handler from hook
              />
          )}

          {calculations && (
             <PaymentSchedule paymentDueList={calculations.paymentDueList} />
          )}

          {calculations && calculations.paymentHistory.length > 0 && (
            <PaymentHistory
              paymentHistory={calculations.paymentHistory}
              leaseStatus={lease.status}
              onProcessRefundClick={openRefundModal} // Use handler from hook
            />
          )}

          {lease.terms && Object.keys(lease.terms).length > 0 && (
            <LeaseTerms terms={lease.terms} />
          )}
        </div>

        {/* Payment Recording Form */}
        {showPaymentForm && (
          <RecordPaymentModal
            isOpen={showPaymentForm}
            onClose={closePaymentModal} // Use handler from hook
            onSubmit={handleRecordPayment} // Use handler from hook
            formData={paymentFormData}
            setFormData={setPaymentFormData}
            isRecording={recordingPayment}
            paymentError={paymentError}
            defaultRentAmount={lease.monthly_rent}
          />
        )}
      </div> 
        {/* Refund Form Modal */}
        {showRefundForm && (
          <ProcessRefundModal
            isOpen={showRefundForm}
            onClose={closeRefundModal} // Use handler from hook
            onSubmit={handleRefund} // Use handler from hook
            formData={refundFormData}
            setFormData={setRefundFormData}
            isProcessing={processingRefund}
            refundError={refundError}
            calculations={calculations}
          />
        )}
    </div>
  )
}