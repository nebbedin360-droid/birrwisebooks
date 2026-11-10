function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Please log in' });
    }
    return res.redirect('/login.html');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== 'admin') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.redirect('/login.html');
  }
  next();
}

function requireCustomer(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== 'customer') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ error: 'Customer access required' });
    }
    return res.redirect('/login.html');
  }
  next();
}

module.exports = { requireLogin, requireAdmin, requireCustomer };
