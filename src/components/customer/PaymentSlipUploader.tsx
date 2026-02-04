import React, { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { verifyPayment, uploadSlipImage } from '@/lib/thunderClient'
import { useOrderStore } from '@/store/orderStore'
import LoadingSpinner from '../common/LoadingSpinner'
import Button from '../common/Button'
import toast from 'react-hot-toast'

interface PaymentSlipUploaderProps {
  orderId: string
  orderNumber: string
  totalAmount: number
  onVerificationComplete: (success: boolean) => void
}

const PaymentSlipUploader: React.FC<PaymentSlipUploaderProps> = ({
  orderId,
  orderNumber,
  totalAmount,
  onVerificationComplete,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [transRef, setTransRef] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileSelect(acceptedFiles[0])
      }
    },
    onDropRejected: (rejections) => {
      const error = rejections[0].errors[0]
      if (error.code === 'file-too-large') {
        toast.error('File too large. Maximum size is 5MB.')
      } else if (error.code === 'file-invalid-type') {
        toast.error('Invalid file type. Please upload an image or PDF.')
      } else {
        toast.error('Error uploading file. Please try again.')
      }
    },
  })

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setVerificationResult(null)
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setVerificationResult(null)
  }

  const handleVerifyPayment = async () => {
    if (!file) {
      toast.error('Please select a payment slip')
      return
    }

    if (!transRef.trim()) {
      toast.error('Please enter transaction reference')
      return
    }

    setIsUploading(true)
    setIsVerifying(true)

    try {
      // 1. Upload slip to storage
      const slipUrl = await uploadSlipImage(file)

      // 2. Verify with Thunder API
      const verification = await verifyPayment({
        order_id: orderId,
        trans_ref: transRef.trim(),
        amount: totalAmount,
        slip_url: slipUrl,
      })

      if (verification.success && verification.verified) {
        setVerificationResult({
          success: true,
          message: 'Payment verified successfully!',
        })
        
        // Update order status via store
        const { updateOrderStatus } = useOrderStore.getState()
        await updateOrderStatus(orderId, 'paid')
        
        onVerificationComplete(true)
        toast.success('Payment verified! Your order is now being processed.')
      } else {
        setVerificationResult({
          success: false,
          message: verification.error || 'Payment verification failed',
        })
        onVerificationComplete(false)
        toast.error('Verification failed. Please check the slip details.')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      setVerificationResult({
        success: false,
        message: errorMessage,
      })
      onVerificationComplete(false)
      toast.error('Verification failed. Please try again.')
      console.error('Verification error:', error)
    } finally {
      setIsUploading(false)
      setIsVerifying(false)
    }
  }

  const isVerificationDisabled = !file || !transRef.trim() || isUploading || isVerifying

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Upload Payment Slip</h3>
        <p className="text-sm text-muted-foreground">
          Upload a clear photo of your payment slip. Make sure the amount matches exactly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Upload area */}
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-input hover:border-primary hover:bg-accent/50'
              }
              ${file ? 'border-primary bg-primary/5' : ''}
            `}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <FileText className="w-8 h-8" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFile()
                  }}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {isDragActive ? 'Drop the file here' : 'Click or drag to upload'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG, PDF up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Reference Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Transaction Reference *
            </label>
            <input
              type="text"
              value={transRef}
              onChange={(e) => setTransRef(e.target.value)}
              placeholder="Enter reference number from payment slip"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              disabled={isUploading || isVerifying}
            />
            <p className="text-xs text-muted-foreground">
              Find this number on your payment confirmation
            </p>
          </div>

          {/* Verification Requirements */}
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <h4 className="font-medium text-sm">Verification Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Amount must match exactly: <strong>฿{totalAmount.toFixed(2)}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Transaction reference must be unique</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Slip must be clear and readable</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column - Preview and status */}
        <div className="space-y-4">
          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Preview</h4>
              <div className="relative rounded-lg border border-input overflow-hidden">
                {file?.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Payment slip preview"
                    className="w-full h-auto max-h-64 object-contain bg-muted"
                  />
                ) : (
                  <div className="p-8 bg-muted flex flex-col items-center justify-center">
                    <FileText className="w-16 h-16 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">PDF Document</p>
                    <p className="text-xs text-muted-foreground">{file?.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="p-4 rounded-lg border space-y-3">
            <h4 className="font-medium">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to Pay:</span>
                <span className="font-bold text-lg text-primary">
                  ฿{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div
              className={`
                p-4 rounded-lg border flex items-start gap-3
                ${verificationResult.success 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
                }
              `}
            >
              {verificationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`
                  font-medium
                  ${verificationResult.success ? 'text-green-800' : 'text-red-800'}
                `}>
                  {verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
                </p>
                <p className={`
                  text-sm mt-1
                  ${verificationResult.success ? 'text-green-700' : 'text-red-700'}
                `}>
                  {verificationResult.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Verifying payment...</span>
            </div>
          ) : (
            <span>Your order will be processed after verification</span>
          )}
        </div>
        
        <Button
          type="button"
          onClick={handleVerifyPayment}
          loading={isUploading || isVerifying}
          disabled={isVerificationDisabled}
          size="lg"
        >
          {isVerifying ? 'Verifying...' : 'Verify Payment'}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Security Notice</p>
            <p className="text-xs text-blue-700 mt-1">
              All payments are verified through Thunder Solution API. Duplicate or fraudulent
              payment slips will be rejected automatically. If you encounter any issues,
              please contact support immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSlipUploader
