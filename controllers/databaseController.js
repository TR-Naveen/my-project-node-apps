const dbDao = require('../dao/databaseDao');
const userDbDao = require('../dao/userDatabaseDao');

exports.getDatabases = (req, res) => {
  dbDao.getDatabases((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(r => r.Database));
  });
};

exports.createDatabase = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Database name required' });

   const userName = req.user && req.user.name;

   if (!userName) {
     return res.status(401).json({ error: 'Unauthorized' });
   }

  dbDao.createDatabase(name, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Link this database to the current user
    userDbDao.addUserDatabase(userName, name, (linkErr) => {
      if (linkErr) return res.status(500).json({ error: linkErr.message });
      res.json({ message: `Database '${name}' created` });
    });
  });
};

exports.dropDatabase = (req, res) => {
  const { name } = req.params;
  dbDao.dropDatabase(name, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Database '${name}' dropped` });
  });
};

