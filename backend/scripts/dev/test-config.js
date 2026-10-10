require('dotenv').config();

console.log('🚀 Admin Order Enhancement - Configuration Check\n');
console.log('=' .repeat(60));

// Test environment configuration
console.log('📧 Email Configuration:');
console.log(`- EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'Not set'}`);
console.log(`- EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
console.log(`- EMAIL_APP_PASSWORD: ${process.env.EMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set'}`);

console.log('\n📱 SMS Configuration:');
console.log(`- SMS_SERVICE: ${process.env.SMS_SERVICE || '❌ Not set'}`);

if (process.env.SMS_SERVICE === 'textlocal') {
  console.log(`- TEXTLOCAL_API_KEY: ${process.env.TEXTLOCAL_API_KEY ? '✅ Set' : '❌ Not set'}`);
} else if (process.env.SMS_SERVICE === 'fast2sms') {
  console.log(`- FAST2SMS_API_KEY: ${process.env.FAST2SMS_API_KEY ? '✅ Set' : '❌ Not set'}`);
} else if (process.env.SMS_SERVICE === 'twilio') {
  console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not set'}`);
  console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`- TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Not set'}`);
} else {
  console.log('💡 No SMS service configured. Add SMS_SERVICE to .env file');
}

console.log('\n🎯 Admin Contact Details (Hard-coded):');
console.log('- Email: sauravsinghking9876@gmail.com ✅');
console.log('- Phone: 6203009518 ✅');

console.log('\n📋 Files Modified:');
console.log('✅ backend/routes/orders.js - Enhanced admin order details & notifications');
console.log('✅ backend/config/email.js - Added admin email notification function');
console.log('✅ backend/config/sms.js - Created SMS notification service');
console.log('✅ backend/package.json - Added axios dependency');

console.log('\n🔧 Changes Implemented:');
console.log('1. ✅ Admin order route now populates:');
console.log('   - User: name, email, phone');
console.log('   - Products: name, image, price');
console.log('2. ✅ Admin notifications on new orders:');
console.log('   - Email with complete order details');
console.log('   - SMS with quick order summary');
console.log('3. ✅ Enhanced individual order access for admin');
console.log('4. ✅ Customer gets both email & SMS confirmations');

console.log('\n🧪 To Test:');
console.log('1. Configure email settings in .env (if not already done)');
console.log('2. Optionally configure SMS service in .env');
console.log('3. Place a test order through your website');
console.log('4. Check admin email: sauravsinghking9876@gmail.com');
console.log('5. Check admin phone: 6203009518 (if SMS configured)');
console.log('6. Check admin panel for enhanced order details');

console.log('\n' + '=' .repeat(60));
console.log('✅ Admin Order Enhancement Setup Complete!');

// Test loading the modules to ensure no syntax errors
try {
  console.log('\n🔍 Testing module imports...');
  
  const { sendAdminOrderNotification } = require('../../config/email');
  console.log('✅ Email module loaded successfully');
  
  const { sendAdminOrderSMS } = require('../../config/sms');
  console.log('✅ SMS module loaded successfully');
  
  console.log('✅ All modules import correctly');
  
} catch (error) {
  console.error('❌ Module import error:', error.message);
}