
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentFormProps {
  selectedPackage: string | null;
  packageTitle: string | undefined;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  onCancel: () => void;
  onPurchase: () => void;
  isProcessing: boolean;
  error: string | null;
  detailedError: any;
}

const PaymentForm = ({
  selectedPackage,
  packageTitle,
  phoneNumber,
  setPhoneNumber,
  onCancel,
  onPurchase,
  isProcessing,
  error,
  detailedError
}: PaymentFormProps) => {
  if (!selectedPackage) return null;
  
  return (
    <div className="mt-10 flex flex-col items-center">
      <h3 className="text-xl font-semibold mb-4">
        Complete Your Purchase
      </h3>
      <p className="text-muted-foreground mb-4">
        You selected the {packageTitle} package.
      </p>
      
      {error && (
        <Alert variant="destructive" className="mb-6 max-w-md w-full">
          <AlertDescription className="whitespace-pre-wrap">
            {error}
            {detailedError && (
              <>
                <br /><br />
                <strong>Details:</strong> 
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(detailedError, null, 2)}
                </pre>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="w-full max-w-md mb-6">
        <Label htmlFor="phone" className="mb-2 block">Phone Number (Required)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mb-4"
        />
        <p className="text-xs text-muted-foreground mb-4">
          Your phone number is required by our payment processor for verification purposes.
        </p>
      </div>
      
      <div className="flex space-x-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onPurchase} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Proceed to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default PaymentForm;
