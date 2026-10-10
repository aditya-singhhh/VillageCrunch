const { connect, disconnect, getDb, setDb, ping } = require('./firestore');
const { defineModel } = require('./model');

module.exports = { connect, disconnect, getDb, setDb, ping, defineModel };
