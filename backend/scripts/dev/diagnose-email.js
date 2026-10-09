require('dotenv').config();

console.log('🔍 Gmail Authentication Diagnostic\n');

console.log('Current Configuration:');
console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('- EMAIL_USER:', process.env.EMAIL_USER);
console.log('- EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set (****)' : 'NOT SET');

console.log('\n❌ Problem: Gmail authentication failed');
console.log('Error: 535-5.7.8 Username and Password not accepted');

console.log('\n🛠 SOLUTION - Generate New App Password:');
console.log('1. Go to: https://myaccount.google.com/');
console.log('2. Sign in with: villagecrunchcontact@gmail.com');
console.log('3. Click Security → 2-Step Verification (enable if not already)');
console.log('4. Click Security → App passwords');
console.log('5. Select "Mail" and generate new 16-character password');
console.log('6. Copy the password (something like: abcdxefghijklmno)');

console.log('\n📝 Update .env file with new password:');
console.log('EMAIL_APP_PASSWORD="your_new_16_character_password"');

console.log('\n✅ After fixing:');
console.log('- Run: node test-notifications.js');
console.log('- Should see success message');
console.log('- Admin will get emails when orders are placed');

console.log('\n📧 Current email setup:');
console.log('- From: villagecrunchcontact@gmail.com');
console.log('- To: villagecrunchcontact@gmail.com');
console.log('- Subject: 🚨 New Order Alert #[ORDER_NUMBER]');

const nodemailer = require('nodemailer');

console.log('\n🧪 Quick Connection Test:');
try {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
  
  console.log('✅ Transporter created (but auth will fail)');
} catch (error) {
  console.log('❌ Transporter creation failed:', error.message);
}