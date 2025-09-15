// LeaseDetails.tsx

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useLeaseCalculations, LeaseCalculations } from '../../hooks/useLeaseCalculations'
import type { LeaseWithDetails } from './LeasesPage'

// Import all sub-components as before
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
  // --- All complex logic is now in the hook ---
  const {
    calculations,
    loading,
    isRecordingPayment,
    paymentError,
    isProcessingRefund,
    refundError,
    recordPayment,
    processRefund,
    clearPaymentError,
    clearRefundError
  } = useLeaseCalculations(lease, onUpdated)

  // --- State for UI control (modals and forms) remains in the component ---
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundFormData, setRefundFormData] = useState({
    payment_id: '',
    amount: '',
    reason: ''
  })

  // --- Simple handlers that call the logic from the hook ---
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await recordPayment(paymentFormData)
    if (success) {
      setShowPaymentForm(false)
      setPaymentFormData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
    }
  }

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await processRefund(refundFormData)
    if (success) {
      setShowRefundForm(false)
      setRefundFormData({
        payment_id: '',
        amount: '',
        reason: ''
      })
    }
  }

  // --- RENDER SECTION ---

  if (loading) {
    // Loading skeleton remains the same
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        {/* ... loading skeleton JSX ... */}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          {/* Header JSX is the same */}
        </div>

        <div className="p-6 space-y-8">
          {/* Child components receive data from the hook's 'calculations' object */}
          <LeaseInfoHeader
            // ...props from lease object
          />
          {calculations && (
             <FinancialSummary
                calculations={calculations}
                leaseStatus={lease.status}
                onRecordPaymentClick={() => setShowPaymentForm(true)}
              />
          )}
          {/* Other components like PaymentSchedule, PaymentHistory, etc. */}
        </div>

        {/* --- MODALS --- */}
        {showPaymentForm && (
          <RecordPaymentModal
            isOpen={showPaymentForm}
            onClose={() => {
              setShowPaymentForm(false);
              clearPaymentError();
            }}
            onSubmit={handleRecordPaymentSubmit}
            formData={paymentFormData}
            setFormData={setPaymentFormData}
            isRecording={isRecordingPayment} // From hook
            paymentError={paymentError}       // From hook
            defaultRentAmount={lease.monthly_rent}
          />
        )}
        
        {showRefundForm && (
          <ProcessRefundModal
            isOpen={showRefundForm}
            onClose={() => {
              setShowRefundForm(false);
              clearRefundError();
            }}
            onSubmit={handleRefundSubmit}
            formData={refundFormData}
            setFormData={setRefundFormData}
            isProcessing={isProcessingRefund} // From hook
            refundError={refundError}         // From hook
            calculations={calculations}
          />
        )}
      </div>
    </div>
  )
}