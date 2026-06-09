const db = require('../config/db');

exports.createSession = (userName, callback) => {
  db.query(
    'INSERT INTO user_sessions (user_name, login_time, is_active) VALUES (?, NOW(), 1)',
    [userName],
    callback
  );
};

exports.endLatestSession = (userName, callback) => {
  db.query(
    `UPDATE user_sessions
     SET logout_time = NOW(), is_active = 0
     WHERE user_name = ? AND is_active = 1
     ORDER BY id DESC
     LIMIT 1`,
    [userName],
    callback
  );
};