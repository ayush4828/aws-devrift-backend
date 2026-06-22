const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return;
    }

    const mailOptions = {
      from: `DevRift <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Welcome to DevRift!</h2>
          <p style="color: #555; font-size: 16px;">Hello,</p>
          <p style="color: #555; font-size: 16px;">Thank you for registering. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${options.code}</span>
          </div>
          <p style="color: #555; font-size: 16px;">This code will expire in 10 minutes.</p>
          <p style="color: #555; font-size: 16px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} DevRift. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    throw new Error("Could not send email");
  }
};

module.exports = sendEmail;
