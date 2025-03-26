
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to Zockto!</h1>
        <p>Hi${displayName ? ` ${displayName}` : ''},</p>
        <p>Thank you for signing up to Zockto. We're excited to have you on board!</p>
        <p>With Zockto, you can:</p>
        <ul>
          <li>Generate AI videos based on your competitors</li>
          <li>Analyze results and improve your social media presence</li>
          <li>Save time on content creation</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Zockto Team</p>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Verify your email address</h1>
        <p>Please click the link below to verify your email address:</p>
        <p>
          <a 
            href="${verificationLink}" 
            style="display: inline-block; background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
          >
            Verify Email
          </a>
        </p>
        <p>If you didn't request this verification, you can safely ignore this email.</p>
        <p>Best regards,<br>The Zockto Team</p>
      </div>
    `,
  });
};
