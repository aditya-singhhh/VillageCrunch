# SMS Notification Setup Guide

## Admin Order Notifications Enhancement

The system now sends both **Email** and **SMS** notifications to the admin when a new order is placed.

### Admin Contact Details (Already Configured)
- **Email**: sauravsinghking9876@gmail.com
- **Phone**: 6203009518

## SMS Service Configuration

To enable SMS notifications, you need to configure one of the following SMS services in your `.env` file:

### Option 1: TextLocal (Recommended for India)

1. Sign up at [TextLocal.in](https://www.textlocal.in/)
2. Get your API key from the dashboard
3. Add to your `.env` file:

```env
SMS_SERVICE=textlocal
TEXTLOCAL_API_KEY=your_api_key_here
```

### Option 2: Fast2SMS (Indian Service)

1. Sign up at [Fast2SMS.com](https://www.fast2sms.com/)
2. Get your API key
3. Add to your `.env` file:

```env
SMS_SERVICE=fast2sms
FAST2SMS_API_KEY=your_api_key_here
```

### Option 3: Twilio (International)

1. Sign up at [Twilio.com](https://www.twilio.com/)
2. Get your Account SID, Auth Token, and Phone Number
3. Add to your `.env` file:

```env
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Features Implemented

### 1. Enhanced Admin Order Details ✅
- **Fixed**: Admin can now see full customer details including phone numbers
- **Added**: Product details are now populated in admin order view
- **Improved**: Better data structure for complete order information

### 2. Admin Email Notifications ✅
- **Recipient**: sauravsinghking9876@gmail.com
- **Triggers**: Every new order placement
- **Contains**: 
  - Order details with order number
  - Customer information (name, email, phone)
  - Complete shipping address
  - Itemized order breakdown
  - Payment method and total amount
  - Timestamp in Indian timezone

### 3. Admin SMS Notifications ✅
- **Recipient**: 6203009518
- **Triggers**: Every new order placement
- **Contains**:
  - Order number and total amount
  - Customer name and phone
  - Payment method
  - Number of items
  - Customer city
  - Order timestamp
  - Quick summary for instant awareness

### 4. Customer Notifications Enhanced ✅
- **Email**: Order confirmation with detailed breakdown
- **SMS**: Simple confirmation with order number and amount

## Notification Flow

```
New Order Placed
    ↓
Customer Gets:
├── Email: Detailed order confirmation
└── SMS: Quick confirmation (if phone available)
    ↓
Admin Gets:
├── Email: Complete order details with customer info
└── SMS: Quick alert with key information
```

## Testing

1. **Place a test order** through the website
2. **Check admin email** (sauravsinghking9876@gmail.com) for detailed notification
3. **Check admin phone** (6203009518) for SMS alert (once SMS service is configured)
4. **Verify order details** in admin panel have complete information

## Environment Variables Required

Add these to your `.env` file:

```env
# Email Configuration (already configured)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password

# SMS Configuration (choose one option)
SMS_SERVICE=textlocal  # or fast2sms or twilio
TEXTLOCAL_API_KEY=your_key  # for TextLocal
# OR
FAST2SMS_API_KEY=your_key   # for Fast2SMS
# OR
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number  # for Twilio

# Frontend URL
FRONTEND_URL=https://your-domain.com
```

## Files Modified

1. **backend/routes/orders.js** - Enhanced admin order details and notifications
2. **backend/config/email.js** - Added admin email notification function
3. **backend/config/sms.js** - New SMS notification service (created)

## Benefits

- **Real-time awareness**: Admin gets instant notifications via both email and SMS
- **Complete order information**: No more missing customer details in admin panel  
- **Better customer service**: Full customer contact information readily available
- **Multi-channel alerts**: Email for details, SMS for immediate attention
- **Indian timezone**: All timestamps in IST for local business operations

The system will continue to work even if SMS service is not configured - only email notifications will be sent.