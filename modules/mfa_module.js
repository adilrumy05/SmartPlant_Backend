require("dotenv").config();
const nodemailer = require("nodemailer");
console.log("Using Gmail account:", process.env.FROM_EMAIL);

// Generate 6-digit OTP
exports.generateOtp = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Mask email
exports.maskEmail = function (email) {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at <= 1) return "***" + email.slice(at);
  return email[0] + "***" + email.slice(at - 1);
};

// Nodemailer transporter (USE YOUR .env VARIABLES)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.FROM_EMAIL,       // matches your .env
    pass: process.env.EMAIL_APP_PASS,   // matches your .env
  },
});

// Send OTP to user's email
exports.sendOtpToEmail = async function (to, otp) {
  const mail = {
    from: `"SmartPlant MFA" <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Your SmartPlant Verification Code",
    text: `Your verification code is: ${otp}\nThis code expires in 5 minutes.`,
  };

  await transporter.sendMail(mail);
  console.log(`MFA OTP sent to: ${to}`);
};
