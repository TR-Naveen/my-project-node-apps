const db = require('../config/db');

exports.getDatabases = callback => {
  db.query('SHOW DATABASES', callback);
};

exports.createDatabase = (name, callback) => {
  db.query(`CREATE DATABASE \`${name}\``, callback);
};

exports.dropDatabase = (name, callback) => {
  db.query(`DROP DATABASE \`${name}\``, callback);
};
