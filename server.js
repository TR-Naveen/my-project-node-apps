const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const authController = require('./controllers/authController');
const dbController = require('./controllers/databaseController');
const tableController = require('./controllers/tableController');
const editController = require('./controllers/editController');
const swaggerDocument = require('./swagger.json');

const app = express();
app.use(cors());
app.use(express.json());

// Map Swagger operationIds to controller handlers
const operationHandlers = {
  authSignup: authController.signup,
  authLogin: authController.login,
  authLogout: authController.logout,
  getDatabases: dbController.getDatabases,
  createDatabase: dbController.createDatabase,
  dropDatabase: dbController.dropDatabase,
  getTables: tableController.getTables,
  createTable: tableController.createTable,
  dropTable: tableController.dropTable,
  renameTable: tableController.renameTable,
  getTableData: tableController.getTableData,
  getRows: tableController.getRows,
  insertRow: tableController.insertRow,
  getRow: tableController.getRow,
  updateRow: tableController.updateRow,
  deleteRow: tableController.deleteRow,
  tableAddColumn: tableController.addColumn,
  tableDeleteColumn: tableController.deleteColumn,
  tableRenameColumn: tableController.renameColumn,
  lockEdit: editController.lockEdit,
  editHeartbeat: editController.editHeartbeat,
  unlockEdit: editController.unlockEdit,
};

// Helper: convert OpenAPI path params to Express style
const swaggerPathToExpress = (path) => path.replace(/{([^}]+)}/g, ':$1');

// Register routes from Swagger spec
Object.entries(swaggerDocument.paths || {}).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, operation]) => {
    const operationId = operation.operationId;
    const handler = operationHandlers[operationId];
    if (!handler) return; // skip if no handler defined

    const expressPath = swaggerPathToExpress(path);
    const httpMethod = method.toLowerCase();

    if (typeof app[httpMethod] !== 'function') return;

    const middlewares = [];

    // Protect all database/table/row routes and edit lock APIs with verifyToken
    if (
      expressPath.startsWith('/api/databases') ||
      expressPath.startsWith('/api/edits') ||
      expressPath === '/api/auth/logout'
    ) {
      middlewares.push(authController.verifyToken);
    }

    app[httpMethod](expressPath, ...middlewares, handler);
  });
});

// Swagger UI endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
