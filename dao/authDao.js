const db = require('../config/db');

exports.createUser = (name, email, password, callback) => {
  db.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, password],
    callback
  );
};
exports.findUserByEmail = (email, callback) => {
  db.query('SELECT * FROM users WHERE email = ?', [email], callback);
};