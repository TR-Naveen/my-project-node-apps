// controllers/tableController.js
const tableDao = require('../dao/tableDao');

// Get tables for a database
exports.getTables = (req, res) => {
  const dbName = req.params.dbName;
  tableDao.getTables(dbName, (err, tables) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tables);
  });
};

// Create table
exports.createTable = (req, res) => {
  const dbName = req.params.dbName;
  const { name, columns } = req.body;
  if (!name || !columns || !Array.isArray(columns))
    return res.status(400).json({ error: 'Table name and columns required' });

  tableDao.createTable(dbName, name, columns, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Table '${name}' created in '${dbName}'` });
  });
};

// Drop table
exports.dropTable = (req, res) => {
  const { dbName, tableName } = req.params;
  tableDao.dropTable(dbName, tableName, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Table '${tableName}' dropped from '${dbName}'` });
  });
};

// Rename table
exports.renameTable = (req, res) => {
  const { dbName, tableName } = req.params;
  const { newName } = req.body;

  if (!newName || !newName.trim()) {
    return res.status(400).json({ error: 'New table name is required' });
  }

  tableDao.renameTable(dbName, tableName, newName.trim(), (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      message: `Table '${tableName}' renamed to '${newName.trim()}' in '${dbName}'`,
    });
  });
};

// ----- ROWS -----
// Get all rows (raw rows only)
exports.getRows = (req, res) => {
  const { dbName, tableName } = req.params;
  tableDao.getAllRows(dbName, tableName, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Get single row along with columns and pk (for edit page)
exports.getRow = (req, res) => {
  const { dbName, tableName, id } = req.params;

  tableDao.getColumns(dbName, tableName, (err, cols) => {
    if (err) return res.status(500).json({ error: err.message });
    const pkCol = cols.find((c) => c.Key === 'PRI')?.Field;

    tableDao.getRowById(dbName, tableName, id, (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!row) return res.status(404).json({ error: 'Row not found' });

      res.json({
        columns: cols.map((c) => ({
          name: c.Field,
          type: c.Type,
          isPrimary: c.Key === 'PRI',
          isAutoIncrement: c.Extra && c.Extra.includes('auto_increment'),
        })),
        row,
        pkColumn: pkCol || null,
      });
    });
  });
};

// Insert row
exports.insertRow = (req, res) => {
  const { dbName, tableName } = req.params;
  const row = req.body.row;

  if (!row || typeof row !== 'object') {
    return res.status(400).json({ error: 'Row data required (body.row)' });
  }

  tableDao.insertRow(dbName, tableName, row, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Row inserted', insertId: result.insertId });
  });
};

// Update row
exports.updateRow = (req, res) => {
  const { dbName, tableName, id } = req.params;
  const row = req.body.row;

  if (!row || typeof row !== 'object') {
    return res.status(400).json({ error: 'Row data required (body.row)' });
  }

  tableDao.updateRow(dbName, tableName, id, row, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Row updated' });
  });
};

// Delete row
exports.deleteRow = (req, res) => {
  const { dbName, tableName, id } = req.params;
  tableDao.deleteRow(dbName, tableName, id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Row deleted' });
  });
};

// Fetch both columns + rows for table listing page
exports.getTableData = (req, res) => {
  const { dbName, tableName } = req.params;

  tableDao.getColumns(dbName, tableName, (err, columns) => {
    if (err) return res.status(500).json({ error: err.message });

    const mappedCols = columns.map((c) => ({
      name: c.Field,
      type: c.Type,
      isPrimary: c.Key === 'PRI',
      isAutoIncrement: c.Extra && c.Extra.includes('auto_increment'),
    }));

    tableDao.getAllRows(dbName, tableName, (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ columns: mappedCols, rows });
    });
  });
};

// ----- COLUMNS: ADD / DELETE / RENAME -----

// Add a new column to a table
exports.addColumn = (req, res) => {
  const { dbName, tableName } = req.params;
  const column = req.body;

  if (!column || !column.name || !column.type) {
    return res
      .status(400)
      .json({ error: 'Column name and type are required' });
  }

  tableDao.addColumn(dbName, tableName, column, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Column '${column.name}' added to '${tableName}'` });
  });
};

// Delete a column from a table
exports.deleteColumn = (req, res) => {
  const { dbName, tableName, columnName } = req.params;

  if (!columnName) {
    return res.status(400).json({ error: 'Column name is required' });
  }

  tableDao.deleteColumn(dbName, tableName, columnName, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Column '${columnName}' deleted from '${tableName}'` });
  });
};

// Rename an existing column
exports.renameColumn = (req, res) => {
  const { dbName, tableName, columnName } = req.params;
  const { newName } = req.body;

  if (!newName || !newName.trim()) {
    return res.status(400).json({ error: 'New column name is required' });
  }

  tableDao.renameColumn(
    dbName,
    tableName,
    columnName,
    newName.trim(),
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: `Column '${columnName}' renamed to '${newName.trim()}' in '${tableName}'`,
      });
    }
  );
};
