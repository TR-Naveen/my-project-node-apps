const editDao = require('../dao/editDao');

const LOCK_MAX_AGE_SECONDS = 60;

exports.lockEdit = (req, res) => {
  const { dbName, tableName } = req.body;
  const userName = req.user && req.user.name;

  if (!dbName || !tableName) {
    return res.status(400).json({ error: 'dbName and tableName are required' });
  }
  if (!userName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  editDao.getActiveEditor(dbName, tableName, LOCK_MAX_AGE_SECONDS, (err, active) => {
    if (err) return res.status(500).json({ error: err.message });

    if (active && active.user_name !== userName) {
      return res.status(409).json({
        locked: true,
        lockedBy: {
          name: active.user_name,
        },
      });
    }

    editDao.upsertLock(userName, dbName, tableName, (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ locked: false });
    });
  });
};

exports.editHeartbeat = (req, res) => {
  const { dbName, tableName } = req.body;
  const userName = req.user && req.user.name;

  if (!dbName || !tableName) {
    return res.status(400).json({ error: 'dbName and tableName are required' });
  }
  if (!userName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  editDao.upsertLock(userName, dbName, tableName, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
};

exports.unlockEdit = (req, res) => {
  const { dbName, tableName } = req.body;
  const userName = req.user && req.user.name;

  if (!dbName || !tableName) {
    return res.status(400).json({ error: 'dbName and tableName are required' });
  }
  if (!userName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  editDao.releaseLock(userName, dbName, tableName, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
};
