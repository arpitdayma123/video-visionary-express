
// Logic for extracting relevant data from webhook payload
import type { WebhookPayload } from "./types.ts";

// Extract order ID from webhook payload
export function extractOrderId(payload: WebhookPayload): string | undefined {
  const data = payload.data || payload;
  
  // For PAYMENT_LINK_EVENT format with direct fields
  if (payload.link_id) {
    return payload.link_id;
  }
  
  // Try direct order fields
  if (payload.order?.order_id) {
    return payload.order.order_id;
  }
  
  // Try nested fields
  if (data.order?.order_id) {
    return data.order.order_id;
  }
  
  // Try order_tags
  if (data.order?.order_tags?.link_id) {
    return data.order.order_tags.link_id;
  }
  
  if (data.order?.order_tags?.cf_link_id) {
    return data.order.order_tags.cf_link_id;
  }
  
  // Try link fields
  if (data.link?.link_id) {
    return data.link.link_id;
  }
  
  // Try payment_link fields
  if (data.payment_link?.link_id) {
    return data.payment_link.link_id;
  }
  
  // If still not found, search the entire payload as a string
  const payloadStr = JSON.stringify(payload);
  const orderIdMatch = payloadStr.match(/"order_id":"([^"]+)"/);
  const linkIdMatch = payloadStr.match(/"link_id":"([^"]+)"/);
  
  if (orderIdMatch && orderIdMatch[1]) {
    return orderIdMatch[1];
  }
  
  if (linkIdMatch && linkIdMatch[1]) {
    return linkIdMatch[1];
  }
  
  return undefined;
}

// Extract payment status from webhook payload
export function extractPaymentStatus(payload: WebhookPayload): string | undefined {
  const data = payload.data || payload;
  
  // Direct fields
  if (payload.link_status) {
    return payload.link_status;
  }
  
  // Order fields
  if (payload.order?.transaction_status) {
    return payload.order.transaction_status;
  }
  
  // Nested data
  if (data.payment?.payment_status) {
    return data.payment.payment_status;
  }
  
  // Link fields
  if (data.link?.link_status) {
    return data.link.link_status;
  }
  
  // Payment link fields
  if (data.payment_link?.link_status) {
    return data.payment_link.link_status;
  }
  
  return undefined;
}

// Extract additional relevant data from webhook payload
export function extractAdditionalData(payload: WebhookPayload) {
  const data = payload.data || payload;
  
  // Extract link purpose
  const linkPurpose = payload.link_purpose || 
                      data.link?.link_purpose || 
                      data.payment_link?.link_purpose;
  
  // Extract link amount
  const linkAmount = payload.link_amount || 
                     payload.link_amount_paid || 
                     payload.order?.order_amount ||
                     data.link?.link_amount ||
                     data.payment_link?.link_amount ||
                     data.order?.order_amount;
  
  // Extract customer email
  const customerEmail = payload.customer_details?.customer_email || 
                        data.customer_details?.customer_email;
  
  return {
    linkPurpose,
    linkAmount,
    customerEmail,
    type: payload.type || (payload.link_status ? 'PAYMENT_LINK_EVENT' : 'UNKNOWN')
  };
}
