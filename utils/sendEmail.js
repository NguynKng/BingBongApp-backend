const nodemailer = require("nodemailer");
const { EMAIL_USER, EMAIL_PASS } = require("../config/envVars");

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"BingBong" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw new Error("Email sending failed");
  }
};

const sendVerificationEmail = async (email, code, username, action) => {
  let html = "";
  let subject = "";

  const displayName = username || "User";

  const baseWrapper = (title, icon, message) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid #e0e0e0; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 20px; border-radius: 50%; background: #4caf50; animation: pulse 2s infinite;">
          <span style="font-size: 40px; color: white;">${icon}</span>
        </div>
      </div>
      <h2 style="color: #333; text-align: center; font-size: 28px; margin-bottom: 16px; font-weight: bold;">${title}</h2>
      <p style="font-size: 16px; color: #555; text-align: center; line-height: 1.8;">
        Hi <strong>${displayName}</strong>,<br/>
        ${message}
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; background: #4caf50; color: white; font-size: 20px; font-weight: bold; padding: 12px 32px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          ${code}
        </span>
      </div>
      <p style="font-size: 14px; color: #777; text-align: center;">
        This code will expire in 5 minutes. If you didn't request this, please ignore this email.
      </p>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Thanks,<br/>
        BingBong Team
      </p>
    </div>
    <style>
      @keyframes pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
        }
        50% {
          transform: scale(1.1);
          box-shadow: 0 0 0 20px rgba(76, 175, 80, 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
        }
      }
    </style>
  `;

  if (action === "resetPassword") {
    subject = "🔐 Reset Your Password";
    html = baseWrapper(
      "Reset Your Password",
      "🔐",
      "You requested to reset your password. Use the verification code below:"
    );
  } else if (action === "verifyAccount") {
    subject = "✅ Verify Your Account";
    html = baseWrapper(
      "Verify Your Account",
      "✅",
      "Thank you for signing up! Please verify your account using the code below:"
    );
  } else {
    throw new Error("Invalid action for email verification");
  }

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

module.exports = sendVerificationEmail;
