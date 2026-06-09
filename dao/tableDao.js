// dao/tableDao.js
const mysql = require('mysql2');
require('dotenv').config();

const createTempConnection = (dbName) => {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Saiselvi@06',
    database: dbName,
    // optional: set auth switch if you have new MySQL auth issues:
    // authPlugins: { mysql_native_password: () => require('mysql2/lib/auth_plugins/mysql_native_password') }
  });
};

// ============ TABLES =============

// Get all tables for a DB with exact row count
exports.getTables = (dbName, callback) => {
  const tempDb = createTempConnection(dbName);

  // 1) get list of tables
  tempDb.query('SHOW TABLES', (err, results) => {
    if (err) {
      tempDb.end();
      return callback(err);
    }

    if (!results.length) {
      tempDb.end();
      return callback(null, []);
    }

    const key = Object.keys(results[0])[0];
    const tableNames = results.map((row) => row[key]);

    const out = [];
    let remaining = tableNames.length;
    let errorSent = false;

    // 2) for each table run SELECT COUNT(*)
    tableNames.forEach((tblName) => {
      const safeName = tableTableNameSafe(tblName);

      tempDb.query(
        `SELECT COUNT(*) AS cnt FROM \`${safeName}\``,
        (err2, cntRows) => {
          if (errorSent) return;

          if (err2) {
            errorSent = true;
            tempDb.end();
            return callback(err2);
          }

          const count = cntRows[0].cnt;
          out.push({ name: tblName, rows: count });

          remaining -= 1;
          if (remaining === 0) {
            out.sort(
              (a, b) => tableNames.indexOf(a.name) - tableNames.indexOf(b.name)
            );
            tempDb.end();
            callback(null, out);
          }
        }
      );
    });
  });
};

// Create table with primary key + foreign key support
exports.createTable = (dbName, tableName, columns, callback) => {
  const tempDb = createTempConnection(dbName);
  const safeTable = tableTableNameSafe(tableName);

  if (!Array.isArray(columns) || columns.length === 0) {
    return callback(new Error('No columns provided'));
  }

  const columnDefs = [];
  const fkConstraints = [];

  columns.forEach((col) => {
    if (!col || !col.name || !col.type) return;

    let type = (col.type || 'VARCHAR').toUpperCase();

    if (col.length && String(col.length).trim() !== '') {
      type += `(${col.length})`;
    }

    let def = `\`${col.name}\` ${type}`;

    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    }

    columnDefs.push(def);

    if (
      col.foreignKey &&
      col.foreignKey.referencesTable &&
      col.foreignKey.referencesColumn
    ) {
      const refTable = tableTableNameSafe(col.foreignKey.referencesTable);
      const refColumn = col.foreignKey.referencesColumn;
      const constraintName = `fk_${safeTable}_${col.name}`;

      let fk = `CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${col.name}\`) REFERENCES \`${refTable}\`(\`${refColumn}\`)`;

      if (col.foreignKey.onDelete) {
        fk += ` ON DELETE ${col.foreignKey.onDelete}`;
      }

      if (col.foreignKey.onUpdate) {
        fk += ` ON UPDATE ${col.foreignKey.onUpdate}`;
      }

      fkConstraints.push(fk);
    }
  });

  if (!columnDefs.length) {
    return callback(new Error('No valid columns provided'));
  }

  const allDefs = [...columnDefs, ...fkConstraints].join(', ');
  const sql = `CREATE TABLE \`${safeTable}\` (${allDefs})`;

  console.log('CREATE TABLE SQL =>', sql);

  tempDb.query(sql, (err) => {
    tempDb.end();
    callback(err);
  });
};

exports.dropTable = (dbName, tableName, callback) => {
  const tempDb = createTempConnection(dbName);
  tempDb.query(
    `DROP TABLE \`${tableTableNameSafe(tableName)}\``,
    (err) => {
      tempDb.end();
      callback(err);
    }
  );
};

// COLUMNS + ROWS
exports.getColumns = (dbName, tableName, callback) => {
  const tempDb = createTempConnection(dbName);
  tempDb.query(
    `SHOW COLUMNS FROM \`${tableTableNameSafe(tableName)}\``,
    (err, results) => {
      tempDb.end();
      callback(err, results);
    }
  );
};

exports.getAllRows = (dbName, tableName, callback) => {
  const tempDb = createTempConnection(dbName);
  tempDb.query(
    `SELECT * FROM \`${tableTableNameSafe(tableName)}\``,
    (err, results) => {
      tempDb.end();
      callback(err, results);
    }
  );
};

exports.getRowById = (dbName, tableName, id, callback) => {
  // need to know pk column
  exports.getColumns(dbName, tableName, (err, cols) => {
    if (err) return callback(err);
    const pkCol = cols.find((c) => c.Key === 'PRI');
    if (!pkCol) return callback(new Error('No primary key'));

    const tempDb = createTempConnection(dbName);
    tempDb.query(
      `SELECT * FROM \`${tableTableNameSafe(
        tableName
      )}\` WHERE \`${pkCol.Field}\` = ? LIMIT 1`,
      [id],
      (err2, rows) => {
        tempDb.end();
        if (err2) return callback(err2);
        callback(null, rows && rows[0] ? rows[0] : null);
      }
    );
  });
};

exports.insertRow = (dbName, tableName, row, callback) => {
  if (!row || typeof row !== 'object') return callback(new Error('No data to insert'));

  // Keep keys that are not undefined/null. (Allow empty string as valid value.)
  const keys = Object.keys(row).filter((k) => row[k] !== undefined && row[k] !== null);

  if (!keys.length) return callback(new Error('No data to insert'));

  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${tableTableNameSafe(
    tableName
  )}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  const values = keys.map((k) => row[k]);

  const tempDb = createTempConnection(dbName);
  tempDb.query(sql, values, (err, result) => {
    tempDb.end();
    callback(err, result);
  });
};

exports.updateRow = (dbName, tableName, id, row, callback) => {
  if (!row || typeof row !== 'object') return callback(new Error('No data to update'));

  // First get columns (to know pk and valid columns)
  exports.getColumns(dbName, tableName, (err, cols) => {
    if (err) return callback(err);
    const pkCol = cols.find((c) => c.Key === 'PRI');
    if (!pkCol) return callback(new Error('No primary key'));

    const validColumns = cols.map((c) => c.Field);

    // Build set columns ignoring pk and any invalid fields
    const setCols = Object.keys(row).filter((c) => c !== pkCol.Field && validColumns.includes(c));

    if (!setCols.length) return callback(new Error('No columns to update'));

    const setSql = setCols.map((c) => `\`${c}\` = ?`).join(', ');
    const values = setCols.map((c) => row[c]);
    values.push(id); // for WHERE pk = ?

    const sql = `UPDATE \`${tableTableNameSafe(
      tableName
    )}\` SET ${setSql} WHERE \`${pkCol.Field}\` = ?`;

    const tempDb = createTempConnection(dbName);
    tempDb.query(sql, values, (err2) => {
      tempDb.end();
      callback(err2);
    });
  });
};

exports.deleteRow = (dbName, tableName, id, callback) => {
  exports.getColumns(dbName, tableName, (err, cols) => {
    if (err) return callback(err);
    const pkCol = cols.find((c) => c.Key === 'PRI');
    if (!pkCol) return callback(new Error('No primary key'));

    const tempDb = createTempConnection(dbName);
    tempDb.query(
      `DELETE FROM \`${tableTableNameSafe(
        tableName
      )}\` WHERE \`${pkCol.Field}\` = ?`,
      [id],
      (err2) => {
        tempDb.end();
        callback(err2);
      }
    );
  });
};

// ============ COLUMNS: ADD / DELETE / RENAME =============

exports.addColumn = (dbName, tableName, col, callback) => {
  if (!col || !col.name || !col.type) {
    return callback(new Error('Column name and type are required'));
  }

  const tempDb = createTempConnection(dbName);
  const safeTable = tableTableNameSafe(tableName);

  let type = col.type.toUpperCase();
  if (col.length && String(col.length).trim() !== '') {
    type += `(${col.length})`;
  }

  let sql = `ALTER TABLE \`${safeTable}\` ADD COLUMN \`${col.name}\` ${type}`;
  const params = [];

  if (col.notNull) {
    sql += ' NOT NULL';
  }

  if (col.defaultValue !== undefined && col.defaultValue !== '') {
    sql += ' DEFAULT ?';
    params.push(col.defaultValue);
  }

  tempDb.query(sql, params, (err) => {
    tempDb.end();
    callback(err);
  });
};

exports.deleteColumn = (dbName, tableName, columnName, callback) => {
  const tempDb = createTempConnection(dbName);
  const safeTable = tableTableNameSafe(tableName);

  const sql = `ALTER TABLE \`${safeTable}\` DROP COLUMN \`${columnName}\``;
  tempDb.query(sql, (err) => {
    tempDb.end();
    callback(err);
  });
};

exports.renameColumn = (dbName, tableName, oldName, newName, callback) => {
  const safeTable = tableTableNameSafe(tableName);

  exports.getColumns(dbName, tableName, (err, cols) => {
    if (err) return callback(err);

    const col = cols.find((c) => c.Field === oldName);
    if (!col) return callback(new Error('Column not found'));

    const tempDb = createTempConnection(dbName);

    const type = col.Type;
    const nullPart = col.Null === 'NO' ? 'NOT NULL' : 'NULL';
    let defaultPart = '';
    if (col.Default !== null) {
      defaultPart = ' DEFAULT ' + tempDb.escape(col.Default);
    }
    const extraPart = col.Extra ? ` ${col.Extra}` : '';

    const sql = `ALTER TABLE \`${safeTable}\` CHANGE COLUMN \`${oldName}\` \`${newName}\` ${type} ${nullPart}${defaultPart}${extraPart}`;

    tempDb.query(sql, (err2) => {
      tempDb.end();
      callback(err2);
    });
  });
};

// ============ RENAME TABLE =============

exports.renameTable = (dbName, oldName, newName, callback) => {
  const tempDb = createTempConnection(dbName);
  const safeOld = tableTableNameSafe(oldName);
  const safeNew = tableTableNameSafe(newName);

  const sql = `RENAME TABLE \`${safeOld}\` TO \`${safeNew}\``;

  tempDb.query(sql, (err) => {
    tempDb.end();
    callback(err);
  });
};

// Simple safety helper to avoid accidental template injection of table name (keeps backticks)
// NOTE: we still expect well-formed table names from the app. This prevents characters like ` in name.
function tableTableNameSafe(name) {
  return String(name).replace(/`/g, '');
}
