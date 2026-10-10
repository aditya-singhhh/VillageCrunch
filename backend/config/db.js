const { connect } = require('../db');

/** Connects to Firestore and exits the process if it cannot be reached. */
const connectDB = async () => {
  try {
    await connect();
  } catch (error) {
    console.error(`❌ Firestore connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
