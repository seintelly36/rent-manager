import React from 'react'
import { format } from 'date-fns'
import { Building2, Calendar, DollarSign, User, FileText, MapPin } from 'lucide-react'

interface PaymentWithDetails {
  id: string
  amount: number
  payment_date: string
  type: 'rent' | 'deposit' | 'refund'
  status: 'paid' | 'pending' | 'failed'
  notes?: string | null
  tenant?: { name: string; email?: string }
  property?: { name: string; address: string }
}

interface ReceiptGeneratorProps {
  payment: PaymentWithDetails
  receiptNumber?: string
}

export function ReceiptGenerator({ payment, receiptNumber }: ReceiptGeneratorProps) {
  const currentDate = new Date()
  const generatedReceiptNumber = receiptNumber || `REC-${payment.id.slice(-8).toUpperCase()}`

  return (
    <div 
      id={`receipt-${payment.id}`}
      className="bg-white p-8 max-w-md mx-auto border border-gray-300 font-mono text-sm"
      style={{ width: '384px' }} // Fixed width for consistent printing
    >
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex items-center justify-center mb-2">
          <Building2 className="w-8 h-8 mr-2" />
          <h1 className="text-xl font-bold">RentManager</h1>
        </div>
        <p className="text-xs text-gray-600">Property Management System</p>
        <h2 className="text-lg font-bold mt-2">PAYMENT RECEIPT</h2>
      </div>

      {/* Receipt Details */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Receipt #:</span>
          <span>{generatedReceiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date Issued:</span>
          <span>{format(currentDate, 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Payment Date:</span>
          <span>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Status:</span>
          <span className={`uppercase font-bold ${
            payment.status === 'paid' ? 'text-green-600' : 
            payment.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {payment.status}
          </span>
        </div>
      </div>

      {/* Tenant Information */}
      <div className="mb-6 border-t border-gray-300 pt-4">
        <h3 className="font-bold mb-2 flex items-center">
          <User className="w-4 h-4 mr-1" />
          TENANT INFORMATION
        </h3>
        <div className="space-y-1 text-xs">
          <div><span className="font-semibold">Name:</span> {payment.tenant?.name || 'N/A'}</div>
          {payment.tenant?.email && (
            <div><span className="font-semibold">Email:</span> {payment.tenant.email}</div>
          )}
        </div>
      </div>

      {/* Property Information */}
      <div className="mb-6 border-t border-gray-300 pt-4">
        <h3 className="font-bold mb-2 flex items-center">
          <MapPin className="w-4 h-4 mr-1" />
          PROPERTY INFORMATION
        </h3>
        <div className="space-y-1 text-xs">
          <div><span className="font-semibold">Property:</span> {payment.property?.name || 'N/A'}</div>
          <div><span className="font-semibold">Address:</span> {payment.property?.address || 'N/A'}</div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6 border-t border-gray-300 pt-4">
        <h3 className="font-bold mb-2 flex items-center">
          <DollarSign className="w-4 h-4 mr-1" />
          PAYMENT DETAILS
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Payment Type:</span>
            <span className="capitalize font-semibold">{payment.type}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
            <span>AMOUNT {payment.type === 'refund' ? 'REFUNDED' : 'PAID'}:</span>
            <span className={payment.type === 'refund' ? 'text-red-600' : 'text-green-600'}>
              {payment.type === 'refund' ? '-' : ''}${Math.abs(payment.amount).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="mb-6 border-t border-gray-300 pt-4">
          <h3 className="font-bold mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            NOTES
          </h3>
          <p className="text-xs break-words">{payment.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-4 text-center text-xs text-gray-600">
        <p className="mb-1">Thank you for your payment!</p>
        <p>Generated on {format(currentDate, 'MMM dd, yyyy \'at\' h:mm a')}</p>
        <p className="mt-2 font-semibold">Keep this receipt for your records</p>
      </div>
    </div>
  )
}