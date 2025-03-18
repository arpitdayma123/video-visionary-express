
// Type definitions for Cashfree webhook

export interface WebhookPayload {
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_tags?: {
        cf_link_id?: string;
        link_id?: string;
      };
    };
    payment?: {
      cf_payment_id?: number;
      payment_status?: string;
      payment_amount?: number;
    };
    customer_details?: {
      customer_email?: string;
      customer_phone?: string;
    };
    link?: {
      link_id?: string;
      link_status?: string;
      link_amount?: string;
      link_purpose?: string;
    };
    payment_link?: {
      link_id?: string;
      link_status?: string;
      link_amount?: string;
      link_purpose?: string;
    };
  };
  event_time?: string;
  type?: string;
  
  // Direct fields for PAYMENT_LINK_EVENT
  link_id?: string;
  link_status?: string;
  link_amount?: string;
  link_purpose?: string;
  link_amount_paid?: string;
  cf_link_id?: number;
  link_url?: string;
  customer_details?: {
    customer_email?: string;
    customer_phone?: string;
    customer_name?: string;
  };
  order?: {
    order_id?: string;
    transaction_status?: string;
    order_amount?: string;
    transaction_id?: number;
  };
}

export interface OrderData {
  user_id: string;
  credits: number;
  status: string;
}

export interface ProfileData {
  id: string;
  email: string | null;
  credit: number;
}
