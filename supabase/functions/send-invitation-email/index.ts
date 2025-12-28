// @ts-nocheck - This is a Deno Edge Function with URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use Brevo (Sendinblue) API instead of Resend
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { to, name, inviteUrl } = await req.json();

    if (!to || !name || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, name, inviteUrl" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2563eb;
              margin-bottom: 20px;
            }
            p {
              margin-bottom: 16px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: #ffffff !important;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
              font-size: 16px;
            }
            .button:hover {
              background-color: #1d4ed8;
            }
            .highlight {
              background-color: #f0f9ff;
              border-left: 4px solid #2563eb;
              padding: 16px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 You're Invited to Join HSE Hub!</h1>
            <p>Hello ${name},</p>
            <p>You've been invited to join your team on <strong>HSE Hub</strong> – a comprehensive Health, Safety, and Environment management platform.</p>
            
            <div class="highlight">
              <p style="margin: 0;"><strong>What happens next?</strong></p>
              <p style="margin: 8px 0 0 0;">Click the button below to create your account and join your team. You'll be able to access your company's HSE Hub immediately.</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${inviteUrl}" class="button">Join Your Team</a>
            </p>
            
            <p style="font-size: 14px; color: #6b7280;">
              <strong>Note:</strong> This invitation link will expire in 30 days. If you have any questions, please contact your administrator.
            </p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${inviteUrl}</p>
            
            <div class="footer">
              <p>This is an automated message from HSE Hub. If you didn't expect this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Brevo API
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "HSE Hub",
          email: "noreply@hse-hub.com",
        },
        to: [
          {
            email: to,
            name: name,
          },
        ],
        subject: "You're Invited to Join HSE Hub!",
        htmlContent: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Brevo API error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
