require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Transporter implementation
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
    },
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log('SMTP connection error:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

// Route: Send OTP
app.post('/send-otp', async (req, res) => {
    const { to_email, otp_code, user_name, app_name } = req.body;

    if (!to_email || !otp_code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const appName = app_name || 'International Credit Union';
    const logoUrl = process.env.APP_LOGO_URL || 'https://via.placeholder.com/200x60?text=International+Credit+Union';

    const mailOptions = {
        from: `"${appName}" <${process.env.SMTP_USER}>`,
        to: to_email,
        subject: `Verification Code: ${otp_code}`,
        text: `Hello ${user_name || 'Member'},\n\nEnter this OTP to verify your account: ${otp_code}\n\nThank you for using ${appName}.`,
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 10px; background-color: #ffffff;">
                <img src="${logoUrl}" alt="${appName} Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 20px;" />
                <h2 style="color: #021633; margin-bottom: 10px;">Verify Your Account</h2>
                <p style="font-size: 16px; color: #555;">Hello <strong>${user_name || 'Member'}</strong>,</p>
                <p style="font-size: 16px; color: #555;">Enter this OTP to verify your account:</p>
                <div style="background-color: #f6f9ff; border: 1px solid #cce0ff; padding: 20px; margin: 25px auto; border-radius: 8px; display: inline-block;">
                    <h1 style="color: #0a2f7a; letter-spacing: 8px; margin: 0; font-size: 36px;">${otp_code}</h1>
                </div>
                <p style="font-size: 14px; color: #777;">If you didn't request this code, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 13px; color: #999;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP Email sent: ' + info.response);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP email:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Route: Send Alert
app.post('/send-alert', async (req, res) => {
    const { to_email, amount, details, balance, user_name, app_name, date } = req.body;

    if (!to_email || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
        from: `"${app_name}" <${process.env.SMTP_USER}>`,
        to: to_email,
        subject: `Debit Alert: $${amount}`,
        text: `Hello ${user_name || 'Member'},\n\nA debit transaction of $${amount} was recorded on your account.\nDetails: ${details}\nNew Balance: $${balance}\nDate: ${date || new Date().toLocaleString()}`,
        html: `<h3>Debit Alert</h3>
               <p>Hello <strong>${user_name || 'Member'}</strong>,</p>
               <p>A debit transaction of <strong>$${amount}</strong> was recorded on your account.</p>
               <p><strong>Details:</strong> ${details}</p>
               <p><strong>New Balance:</strong> $${balance}</p>
               <p><strong>Date:</strong> ${date || new Date().toLocaleString()}</p>`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Alert Email sent: ' + info.response);
        res.json({ success: true, message: 'Alert sent successfully' });
    } catch (error) {
        console.error('Error sending Alert email:', error);
        res.status(500).json({ error: 'Failed to send Alert' });
    }
});

// Route: Send Contact Form
app.post('/send-contact', async (req, res) => {
    const { firstName, lastName, email, phone, accountNo, inquiryType, subject, message } = req.body;

    if (!firstName || !lastName || !email || !inquiryType || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const appName = process.env.APP_NAME || 'International Credit Union';
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;

    const mailOptions = {
        from: `"${appName} Contact Form" <${process.env.SMTP_USER}>`,
        to: supportEmail, // Send to the support team
        replyTo: email,
        subject: `New Contact Inquiry: ${subject}`,
        text: `You have received a new contact inquiry.\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nAccount Number: ${accountNo || 'N/A'}\nInquiry Type: ${inquiryType}\nSubject: ${subject}\nMessage: ${message}`,
        html: `<h3>New Contact Form Submission</h3>
               <table border="0" cellpadding="5" cellspacing="0" style="text-align: left;">
                 <tr><td><strong>Name:</strong></td><td>${firstName} ${lastName}</td></tr>
                 <tr><td><strong>Email:</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
                 <tr><td><strong>Phone:</strong></td><td>${phone || 'N/A'}</td></tr>
                 <tr><td><strong>Account No:</strong></td><td>${accountNo || 'N/A'}</td></tr>
                 <tr><td><strong>Inquiry Type:</strong></td><td>${inquiryType}</td></tr>
                 <tr><td><strong>Subject:</strong></td><td>${subject}</td></tr>
               </table>
               <h4>Message:</h4>
               <p style="background: #f4f4f4; padding: 15px; border-radius: 5px;">${message}</p>`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Contact Email sent: ' + info.response);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending Contact email:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.listen(PORT, () => {
    console.log(`Email service running on http://localhost:${PORT}`);
});
