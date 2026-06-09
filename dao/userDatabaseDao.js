const db = require('../config/db');

// Link a database name to a user in user_databases (by user_name)
exports.addUserDatabase = (userName, dbName, callback) => {
  db.query(
    'INSERT INTO user_databases (user_name, db_name, created_at) VALUES (?, ?, NOW())',
    [userName, dbName],
    callback
  );
};

// Optional helper to list databases for a user by name
exports.getUserDatabases = (userName, callback) => {
  db.query(
    'SELECT * FROM user_databases WHERE user_name = ?',
    [userName],
    callback
  );
};
