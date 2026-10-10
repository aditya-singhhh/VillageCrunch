/**
 * Create or promote an admin account. Admins can no longer be created through the
 * public /api/auth/register endpoint.
 *
 *   node scripts/createAdmin.js <email> [name] [phone]
 *
 * The password is read from the ADMIN_PASSWORD env var (or generated and printed once).
 * Needs Firestore access: GOOGLE_APPLICATION_CREDENTIALS (service-account key) or FIRESTORE_EMULATOR_HOST.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const crypto = require('crypto');
const db = require('../db');
const User = require('../models/User');

(async () => {
  const [email, name = 'Admin', phone = '9000000000'] = process.argv.slice(2);
  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/createAdmin.js <email> [name] [phone]');
    process.exit(1);
  }
  await db.connect();
  try {
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`✅ Existing user ${user.email} promoted to admin (password unchanged).`);
    } else {
      const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
      if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
      user = await User.create({ name, email, phone, password, role: 'admin' });
      console.log(`✅ Admin created: ${user.email}`);
      if (!process.env.ADMIN_PASSWORD) console.log(`   Generated password (shown once): ${password}`);
    }
  } finally {
    await db.disconnect();
  }
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
