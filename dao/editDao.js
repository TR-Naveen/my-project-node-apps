const db = require('../config/db');

exports.getActiveEditor = (dbName, tableName, maxAgeSeconds, callback) => {
  db.query(
    `SELECT *
     FROM active_edits
     WHERE db_name = ?
       AND table_name = ?
       AND last_heartbeat >= NOW() - INTERVAL ? SECOND
     ORDER BY id DESC
     LIMIT 1`,
    [dbName, tableName, maxAgeSeconds],
    (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    }
  );
};

exports.upsertLock = (userName, dbName, tableName, callback) => {
  db.query(
    `INSERT INTO active_edits (user_name, db_name, table_name, started_at, last_heartbeat)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [userName, dbName, tableName],
    callback
  );
};

exports.releaseLock = (userName, dbName, tableName, callback) => {
  db.query(
    'DELETE FROM active_edits WHERE user_name = ? AND db_name = ? AND table_name = ?',
    [userName, dbName, tableName],
    callback
  );
};
