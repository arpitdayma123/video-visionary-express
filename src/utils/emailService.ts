
import { supabase } from "@/integrations/supabase/client";

interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async ({ to, subject, html, from }: SendEmailProps) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { to, subject, html, from },
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in email service:", error);
    throw error;
  }
};

// Helper for sending welcome emails
export const sendWelcomeEmail = async (email: string, name?: string) => {
  const displayName = name || email.split('@')[0];
  
  return sendEmail({
    to: email,
    subject: "Welcome to Zockto!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; text-align: center;">Welcome to Zockto!</h1>
          <p style="color: #333; line-height: 1.6;">Hi${displayName ? ` ${displayName}` : ''},</p>
          <p style="color: #333; line-height: 1.6;">Thank you for signing up to Zockto. We're excited to have you on board!</p>
          <p style="color: #333; line-height: 1.6;">With Zockto, you can:</p>
          <ul style="color: #333; line-height: 1.6;">
            <li>Generate AI videos based on your competitors</li>
            <li>Analyze results and improve your social media presence</li>
            <li>Save time on content creation</li>
          </ul>
          <p style="color: #333; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
          <p style="color: #333; line-height: 1.6;">Best regards,<br>The Zockto Team</p>
        </div>
      </div>
    `,
  });
};

// Helper for sending verification emails
export const sendVerificationEmail = async (email: string, verificationLink: string) => {
  return sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; text-align: center;">Verify your email address</h1>
          <p style="color: #333; line-height: 1.6;">Please click the link below to verify your email address:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a 
              href="${verificationLink}" 
              style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;"
            >
              Verify Email
            </a>
          </div>
          <p style="color: #333; line-height: 1.6;">If you didn't request this verification, you can safely ignore this email.</p>
          <p style="color: #333; line-height: 1.6;">Best regards,<br>The Zockto Team</p>
        </div>
      </div>
    `,
  });
};

// New function for sending bulk emails to all users
interface BulkEmailContent {
  subject: string;
  title: string;
  subtitle: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}

export const sendBulkEmail = async (content: BulkEmailContent) => {
  try {
    // Format HTML from the provided content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; text-align: center;">${content.title}</h1>
          <p style="color: #333; line-height: 1.6; font-size: 18px;">${content.subtitle}</p>
          <div style="color: #333; line-height: 1.6;">
            ${content.content.replace(/\n/g, "<br>")}
          </div>
          ${content.buttonText ? 
            `<div style="text-align: center; margin-top: 30px;">
              <a 
                href="${content.buttonUrl || "#"}" 
                style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;"
              >
                ${content.buttonText}
              </a>
            </div>` 
          : ''}
          <p style="color: #333; line-height: 1.6; margin-top: 30px;">Best regards,<br>The Zockto Team</p>
        </div>
      </div>
    `;

    // Call the send-bulk-email edge function
    const { data, error } = await supabase.functions.invoke("send-bulk-email", {
      body: { 
        subject: content.subject,
        html: html
      },
    });

    if (error) {
      console.error("Error sending bulk email:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in bulk email service:", error);
    throw error;
  }
};
