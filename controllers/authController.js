const jwt = require('jsonwebtoken');
const authDao = require('../dao/authDao');
const sessionDao = require('../dao/sessionDao');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (!email.endsWith('@sonata-software.com')) {
    return res.status(400).json({ error: 'Email must be @sonata-software.com' });
  }

  authDao.createUser(name, email, password, (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User registered successfully' });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

  authDao.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0 || results[0].password !== password) return res.status(401).json({ error: 'Invalid credentials' });

    const userId = results[0].id;
    const userName = results[0].name;

    sessionDao.createSession(userName, (sessErr) => {
      if (sessErr) {
        // Log session creation failure but do not block login
        console.error('Failed to create session for user', userName, sessErr);
      }

      const token = jwt.sign(
        { id: userId, email: results[0].email, name: userName },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.json({ token, message: 'Login successful' });
    });
  });
};

exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

exports.logout = (req, res) => {
  const userName = req.user && req.user.name;
  if (!userName) return res.status(401).json({ error: 'Unauthorized' });

  sessionDao.endLatestSession(userName, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to end session' });
    res.json({ message: 'Logout successful' });
  });
};
