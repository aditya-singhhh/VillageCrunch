const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // For Gmail (most common)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // App password, not regular password
      },
    });
  }

  // For other email providers (like Outlook, Yahoo, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  if (!email || /@phone\.villagecrunch\.in$/i.test(email)) return { success: false, skipped: true };
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - VillageCrunch</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 0;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #D4AF37, #F4E4BC);
              padding: 30px;
              text-align: center;
              color: #8B4513;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              margin-top: 0;
              font-size: 24px;
            }
            .content p {
              color: #666;
              margin-bottom: 20px;
              font-size: 16px;
            }
            .reset-button {
              display: inline-block;
              background-color: #8B4513;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
              transition: background-color 0.3s;
            }
            .reset-button:hover {
              background-color: #A0522D;
            }
            .security-note {
              background-color: #f8f9fa;
              border-left: 4px solid #D4AF37;
              padding: 15px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
              border-top: 1px solid #e9ecef;
            }
            .footer a {
              color: #D4AF37;
              text-decoration: none;
            }
            .backup-url {
              background-color: #f8f9fa;
              padding: 10px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              word-break: break-all;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🥜 VillageCrunch</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Premium Indian Dry Fruits & Snacks</p>
            </div>
            
            <div class="content">
              <h2>Password Reset Request</h2>
              
              <p>Hello ${userName || 'there'},</p>
              
              <p>We received a request to reset your password for your VillageCrunch account. If you didn't make this request, you can safely ignore this email.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="reset-button">Reset My Password</a>
              </div>
              
              <div class="security-note">
                <p style="margin: 0; font-weight: bold; color: #8B4513;">🔒 Security Notice:</p>
                <p style="margin: 5px 0 0 0;">This link will expire in 10 minutes for your security. If you need a new link, please request another password reset.</p>
              </div>
              
              <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
              
              <div class="backup-url">
                ${resetUrl}
              </div>
              
              <p style="margin-top: 30px;">If you have any questions or need help, please contact our support team.</p>
              
              <p>Best regards,<br>The VillageCrunch Team</p>
            </div>
            
            <div class="footer">
              <p>© 2025 VillageCrunch. All rights reserved.</p>
              <p>Made with ❤️ in Bihar | <a href="${process.env.FRONTEND_URL}">Visit our website</a></p>
              <p style="font-size: 12px; color: #999; margin-top: 15px;">
                If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Password Reset Request - VillageCrunch
      
      Hello ${userName || 'there'},
      
      We received a request to reset your password for your VillageCrunch account.
      
      To reset your password, visit this link: ${resetUrl}
      
      This link will expire in 10 minutes for your security.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The VillageCrunch Team
      
      © 2025 VillageCrunch. All rights reserved.
    `;

    const mailOptions = {
      from: {
        name: 'VillageCrunch',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Reset Your VillageCrunch Password',
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send order confirmation email (bonus feature)
const sendOrderConfirmationEmail = async (email, orderData) => {
  // Customers who signed up with phone OTP have a placeholder address; nothing to send
  if (!email || /@phone\.villagecrunch\.in$/i.test(email)) return { success: false, skipped: true };
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation - VillageCrunch</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; color: #8B4513; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
            .order-details { margin: 20px 0; }
            .item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-weight: bold; font-size: 18px; color: #8B4513; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🥜 VillageCrunch</h1>
              <h2>Order Confirmation</h2>
            </div>
            <p>Thank you for your order! Your order #${orderData.orderNumber} has been confirmed.</p>
            <div class="order-details">
              <h3>Order Summary:</h3>
              ${orderData.items.map(item => `
                <div class="item">
                  <strong>${item.name}</strong> - Qty: ${item.quantity} - ₹${item.price * item.quantity}
                </div>
              `).join('')}
              <div class="total">Total: ₹${orderData.totalPrice}</div>
            </div>
            <p>Payment Method: ${orderData.paymentInfo.method.toUpperCase()}</p>
            <p>We'll send you another email when your order ships!</p>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'VillageCrunch',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `Order Confirmation #${orderData.orderNumber} - VillageCrunch`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw new Error('Failed to send order confirmation email');
  }
};

// Send order notification to admin
const sendAdminOrderNotification = async (orderData, userData) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Order Alert - VillageCrunch Admin</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; color: #8B4513; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
            .alert { background: #ffebee; border: 1px solid #f44336; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .customer-info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .order-details { margin: 20px 0; }
            .item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-weight: bold; font-size: 18px; color: #8B4513; }
            .address { background: #f1f8e9; padding: 10px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🥜 VillageCrunch - Admin Alert</h1>
              <h2>New Order Received!</h2>
            </div>
            
            <div class="alert">
              <h3>🚨 NEW ORDER: #${orderData.orderNumber}</h3>
              <p><strong>Order Date:</strong> ${new Date(orderData.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p><strong>Payment Method:</strong> ${orderData.paymentInfo.method.toUpperCase()}</p>
              <p><strong>Order Status:</strong> ${orderData.status.toUpperCase()}</p>
            </div>

            <div class="customer-info">
              <h3>👤 Customer Information</h3>
              <p><strong>Name:</strong> ${userData.name}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Phone:</strong> ${userData.phone}</p>
            </div>

            <div class="address">
              <h3>📍 Shipping Address</h3>
              <p><strong>Delivery To:</strong> ${orderData.shippingAddress.name}</p>
              <p><strong>Phone:</strong> ${orderData.shippingAddress.phone}</p>
              <p><strong>Address:</strong> ${orderData.shippingAddress.street}</p>
              <p><strong>City:</strong> ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state}</p>
              <p><strong>Pincode:</strong> ${orderData.shippingAddress.pincode}</p>
            </div>

            <div class="order-details">
              <h3>🛍️ Order Items</h3>
              ${orderData.items.map(item => `
                <div class="item">
                  <strong>${item.name}</strong><br>
                  <small>Weight: ${item.weight || 'N/A'}</small><br>
                  Quantity: ${item.quantity} × ₹${item.price} = <strong>₹${item.price * item.quantity}</strong>
                </div>
              `).join('')}
              
              <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd;">
                <p>Items Price: ₹${orderData.itemsPrice}</p>
                <p>Shipping: ₹${orderData.shippingPrice}</p>
                <p>Tax: ₹${orderData.taxPrice}</p>
                ${orderData.promocodeDiscount > 0 ? `<p>Discount (${orderData.promocode?.code}): -₹${orderData.promocodeDiscount}</p>` : ''}
                <div class="total">Total Amount: ₹${orderData.totalPrice}</div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p><strong>⚡ Action Required:</strong> Please process this order in your admin panel</p>
              <p style="color: #666; font-size: 12px;">This is an automated notification from VillageCrunch</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'VillageCrunch System',
        address: process.env.EMAIL_USER
      },
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🚨 New Order Alert #${orderData.orderNumber} - ₹${orderData.totalPrice} - VillageCrunch`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    // Don't throw error to prevent order creation failure
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendAdminOrderNotification,
};