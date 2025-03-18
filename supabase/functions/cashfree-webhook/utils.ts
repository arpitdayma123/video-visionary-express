
// Utility functions for Cashfree webhook processing

// CORS headers for browser requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get credits based on link purpose
export function getCreditsFromPurpose(purpose: string | undefined): number {
  if (!purpose) return 0;
  
  // Extract number from strings like "Credit purchase: 5 credits"
  const match = purpose.match(/Credit purchase: (\d+) credits/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return 0;
}

// Get credits based on package amount
export function getCreditsFromAmount(amount: string | number | undefined): number {
  if (!amount) return 0;
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Apply credit packages logic - match to packages in BuyCredits.tsx
  if (numAmount >= 2999) return 50;
  if (numAmount >= 1499) return 20;
  if (numAmount >= 499) return 5;
  
  return 0;
}
