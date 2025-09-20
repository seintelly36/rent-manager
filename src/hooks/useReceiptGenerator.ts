import { useCallback } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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

export function useReceiptGenerator() {
  const printReceipt = useCallback(async (payment: PaymentWithDetails) => {
    try {
      // Create a temporary container for the receipt
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      document.body.appendChild(tempContainer)

      // Import and render the receipt component
      const { ReceiptGenerator } = await import('../components/payments/ReceiptGenerator')
      const React = await import('react')
      const ReactDOM = await import('react-dom/client')

      const root = ReactDOM.createRoot(tempContainer)
      
      return new Promise<void>((resolve, reject) => {
        root.render(
          React.createElement(ReceiptGenerator, { 
            payment,
            receiptNumber: `REC-${payment.id.slice(-8).toUpperCase()}`
          })
        )

        // Wait for render to complete
        setTimeout(() => {
          const receiptElement = tempContainer.querySelector(`#receipt-${payment.id}`) as HTMLElement
          
          if (!receiptElement) {
            document.body.removeChild(tempContainer)
            reject(new Error('Receipt element not found'))
            return
          }

          // Create print window
          const printWindow = window.open('', '_blank', 'width=400,height=600')
          if (!printWindow) {
            document.body.removeChild(tempContainer)
            reject(new Error('Could not open print window'))
            return
          }

          // Copy styles and content to print window
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Payment Receipt</title>
                <style>
                  body { 
                    margin: 0; 
                    padding: 20px; 
                    font-family: 'Courier New', monospace;
                    background: white;
                  }
                  @media print {
                    body { margin: 0; padding: 10px; }
                    .no-print { display: none; }
                  }
                  .receipt-container {
                    max-width: 384px;
                    margin: 0 auto;
                  }
                </style>
              </head>
              <body>
                <div class="receipt-container">
                  ${receiptElement.outerHTML}
                </div>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                  <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    Print Receipt
                  </button>
                  <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                    Close
                  </button>
                </div>
              </body>
            </html>
          `)
          
          printWindow.document.close()
          
          // Clean up
          document.body.removeChild(tempContainer)
          resolve()
        }, 100)
      })
    } catch (error) {
      console.error('Error printing receipt:', error)
      throw error
    }
  }, [])

  const generateReceiptImage = useCallback(async (payment: PaymentWithDetails): Promise<string> => {
    try {
      // Get or create the receipt element
      let receiptElement = document.querySelector(`#receipt-${payment.id}`) as HTMLElement
      
      if (!receiptElement) {
        // Create temporary element if it doesn't exist
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'absolute'
        tempContainer.style.left = '-9999px'
        tempContainer.style.top = '-9999px'
        tempContainer.innerHTML = `
          <div id="receipt-${payment.id}" class="bg-white p-8 max-w-md mx-auto border border-gray-300 font-mono text-sm" style="width: 384px;">
            <!-- Receipt content will be generated here -->
          </div>
        `
        document.body.appendChild(tempContainer)
        receiptElement = tempContainer.querySelector(`#receipt-${payment.id}`) as HTMLElement
      }

      // Generate canvas from element
      const canvas = await html2canvas(receiptElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        width: 384,
        height: receiptElement.offsetHeight
      })

      // Convert to data URL
      const imageDataUrl = canvas.toDataURL('image/png', 1.0)
      
      return imageDataUrl
    } catch (error) {
      console.error('Error generating receipt image:', error)
      throw error
    }
  }, [])

  const downloadReceiptPDF = useCallback(async (payment: PaymentWithDetails) => {
    try {
      const imageDataUrl = await generateReceiptImage(payment)
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 120] // Thermal receipt size
      })

      // Add image to PDF
      pdf.addImage(imageDataUrl, 'PNG', 5, 5, 70, 0) // Auto height
      
      // Download PDF
      const fileName = `receipt-${payment.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Error downloading receipt PDF:', error)
      throw error
    }
  }, [generateReceiptImage])

  const downloadReceiptImage = useCallback(async (payment: PaymentWithDetails) => {
    try {
      const imageDataUrl = await generateReceiptImage(payment)
      
      // Create download link
      const link = document.createElement('a')
      link.download = `receipt-${payment.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.png`
      link.href = imageDataUrl
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading receipt image:', error)
      throw error
    }
  }, [generateReceiptImage])

  return {
    printReceipt,
    generateReceiptImage,
    downloadReceiptPDF,
    downloadReceiptImage
  }
}