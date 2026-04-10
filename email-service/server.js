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

    const mailOptions = {
        from: `"${app_name}" <${process.env.SMTP_USER}>`,
        to: to_email,
        subject: `Verification Code: ${otp_code}`,
        text: `Hello ${user_name || 'Member'},\n\nYour verification code is: ${otp_code}\n\nThank you for using ${app_name}.`,
        html: `<p>Hello <strong>${user_name || 'Member'}</strong>,</p>
               <p>Your verification code is: <h2 style="color: #1a73e8;">${otp_code}</h2></p>
               <p>Thank you for using ${app_name}.</p>`,
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

app.listen(PORT, () => {
    console.log(`Email service running on http://localhost:${PORT}`);
});
