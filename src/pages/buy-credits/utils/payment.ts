
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { PackageOption } from '../constants';
import { User } from '@supabase/supabase-js';

export interface ProfileData {
  email: string | null;
  credit: number;
}

export interface PaymentOrder {
  status: string;
  credits: number;
}

export interface CashfreeErrorResponse {
  error: string;
  details?: any;
  response?: any;
}

export const initiatePayment = async (
  selectedPkg: PackageOption,
  user: User,
  phoneNumber: string
) => {
  // Get user profile to get email
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('email, credit')
    .eq('id', user.id)
    .single() as { data: ProfileData | null; error: any };
  
  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Could not retrieve user profile');
  }

  // Generate unique order ID
  const orderId = `order_${uuidv4().replace(/-/g, '')}`;
  
  // Use dashboard as the return URL
  const returnUrl = `${window.location.origin}/dashboard`;
  
  // Call Cashfree payment function with phone number
  const response = await supabase.functions.invoke('cashfree-payment', {
    body: {
      orderId,
      orderAmount: selectedPkg.priceValue,
      orderCurrency: 'INR',
      userId: user.id,
      credits: selectedPkg.credits,
      customerEmail: profileData?.email || user.email,
      customerName: user.user_metadata?.full_name || '',
      customerPhone: phoneNumber.trim(),
      returnUrl
    }
  });

  console.log("Payment function response:", response);

  if (response.error) {
    console.error('Payment error:', response.error);
    throw new Error(response.error.message || 'Payment initialization failed');
  }

  if (response.data?.payment_link) {
    return response.data.payment_link;
  } else {
    // Log the entire response for debugging
    console.error('No payment link in response:', response);
    
    // Handle error information
    if (response.data?.error) {
      const errorData = response.data as CashfreeErrorResponse;
      throw new Error(errorData.error || 'No payment link received');
    } else {
      throw new Error('No payment link received');
    }
  }
};

export const checkPaymentStatus = async (orderId: string) => {
  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select('status, credits')
      .eq('order_id', orderId)
      .single() as { data: PaymentOrder | null; error: any };
    
    if (error) {
      return { success: false, message: 'Could not verify payment status. Please contact support.' };
    }

    if (data && data.status === 'PAID') {
      return { 
        success: true, 
        message: `${data.credits} credits have been added to your account.`,
        status: 'PAID',
        credits: data.credits
      };
    } else if (data && data.status === 'FAILED') {
      return { 
        success: false, 
        message: 'Your payment was unsuccessful. Please try again.', 
        status: 'FAILED'
      };
    } else {
      return { 
        success: true, 
        message: 'Your payment is being processed. Credits will be added soon.',
        status: 'PROCESSING'
      };
    }
  } catch (err) {
    console.error('Error checking payment status:', err);
    return { success: false, message: 'An error occurred while checking payment status.' };
  }
};
