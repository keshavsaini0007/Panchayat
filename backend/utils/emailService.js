const { Resend } = require('resend');

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const OTP_EMAIL_TEMPLATE = (otp, expiresInMinutes) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; background: #f4f7f6; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #16a34a; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 15px; color: #374151; margin: 0 0 8px; }
    .message { font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.5; }
    .otp-container { text-align: center; padding: 20px; background: #f0fdf4; border-radius: 12px; }
    .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #16a34a; margin: 0; }
    .expiry { font-size: 13px; color: #9ca3af; margin: 16px 0 0; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Panchayat Complaint Management</h1>
    </div>
    <div class="body">
      <p class="greeting">Hello,</p>
      <p class="message">
        Use the following One-Time Password to verify your email address and complete your account registration.
      </p>
      <div class="otp-container">
        <p class="otp-code">${otp}</p>
        <p class="expiry">This code expires in ${expiresInMinutes} minutes.</p>
      </div>
      <p class="message" style="margin-top: 20px;">
        If you did not request this, please ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>Panchayat Complaint Management System &bull; Secure &amp; Trusted</p>
    </div>
  </div>
</body>
</html>
`;

const sendOtpEmail = async (email, otp) => {
  if (!resend) {
    console.log('=== EMAIL SERVICE DISABLED ===');
    console.log('RESEND_API_KEY not configured.');
    console.log(`OTP for ${email}: ${otp}`);
    console.log('=============================');
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your OTP for Panchayat Account Registration',
      html: OTP_EMAIL_TEMPLATE(otp, 10),
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
};

const VERIFICATION_EMAIL_TEMPLATE = (citizenName, complaintTitle, complaintId, village) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; background: #f4f7f6; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #16a34a; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 15px; color: #374151; margin: 0 0 8px; }
    .message { font-size: 14px; color: #6b7280; margin: 0 0 16px; line-height: 1.5; }
    .details { background: #f9fafb; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .details p { margin: 4px 0; font-size: 14px; color: #374151; }
    .details strong { color: #111827; }
    .btn-container { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Panchayat Complaint Management</h1>
    </div>
    <div class="body">
      <p class="greeting">Dear ${citizenName},</p>
      <p class="message">
        Your complaint has been marked as resolved by the Panchayat. Please verify whether the issue has actually been resolved.
      </p>
      <div class="details">
        <p><strong>Complaint ID:</strong> ${complaintId}</p>
        <p><strong>Title:</strong> ${complaintTitle}</p>
        <p><strong>Village:</strong> ${village}</p>
      </div>
      <div class="btn-container">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/complaints/${complaintId}" class="btn">View & Verify</a>
      </div>
      <p class="message">
        If the issue is resolved, please confirm closure. If the issue still exists, you can reopen the complaint for further action.
      </p>
    </div>
    <div class="footer">
      <p>Panchayat Complaint Management System &bull; Secure &amp; Trusted</p>
    </div>
  </div>
</body>
</html>
`;

const sendVerificationEmail = async (email, citizenName, complaintTitle, complaintId, village) => {
  if (!resend) {
    console.log('=== EMAIL SERVICE DISABLED ===');
    console.log(`Verification email for ${email} regarding complaint ${complaintId}`);
    console.log('=============================');
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your complaint has been marked as resolved - Please verify',
      html: VERIFICATION_EMAIL_TEMPLATE(citizenName, complaintTitle, complaintId, village),
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendOtpEmail, sendVerificationEmail };
