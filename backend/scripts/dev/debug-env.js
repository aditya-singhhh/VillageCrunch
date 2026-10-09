require('dotenv').config();

console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '***SECRET_SET***' : 'NOT_SET');
console.log('PORT:', process.env.PORT);

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  console.log('✅ Razorpay environment variables are loaded correctly!');
} else {
  console.log('❌ Razorpay environment variables are missing!');
  console.log('   Check your .env file is in the correct location');
  console.log('   Current directory:', __dirname);
}