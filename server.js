const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const { requireLogin, requireAdmin, requireCustomer } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

['uploads', 'books', 'data'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'birr-wise-secret-change-in-production-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ========== AUTH ==========
app.post('/api/register', (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'ሙሉ ስም፣ ስልክ ቁጥር እና የይለፍ ቃል ያስፈልጋሉ' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'የይለፍ ቃሉ ቢያንስ 6 ቁምፊ መሆን አለበት' });
    }
    if (db.findUserByPhone(phone.trim())) {
      return res.status(400).json({ error: 'ይህ ስልክ ቁጥር አስቀድሞ ተመዝግቧል' });
    }
    const hash = bcrypt.hashSync(password, 12);
    const user = db.createUser({ name: name.trim(), phone: phone.trim(), password_hash: hash });
    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.role = user.role;
    req.session.mustChangePassword = false;
    res.json({ success: true, message: 'በተሳካ ሁኔታ ተመዝግበዋል' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'ስልክ / የተጠቃሚ ስም እና የይለፍ ቃል ያስፈልጋሉ' });
    }
    const user = db.findUserByPhone(phone.trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'የተሳሳተ ስልክ / የተጠቃሚ ስም ወይም የይለፍ ቃል' });
    }
    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.role = user.role;
    req.session.mustChangePassword = !!user.must_change_password;
    res.json({
      success: true,
      role: user.role,
      mustChangePassword: !!user.must_change_password,
      name: user.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    id: req.session.userId,
    name: req.session.name,
    role: req.session.role,
    mustChangePassword: !!req.session.mustChangePassword
  });
});

app.post('/api/change-password', requireLogin, (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'አዲሱ የይለፍ ቃል ቢያንስ 6 ቁምፊ መሆን አለበት' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'የይለፍ ቃሎቹ አይዛመዱም' });
    }
    const hash = bcrypt.hashSync(newPassword, 12);
    db.updateUser(req.session.userId, { password_hash: hash, must_change_password: false });
    req.session.mustChangePassword = false;
    res.json({ success: true, message: 'የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

// ========== PAYMENT SETTINGS ==========
app.get('/api/payment-settings', (req, res) => {
  res.json(db.getSettings() || {});
});

// ========== CUSTOMER PAYMENT ==========
app.post('/api/payment-request', requireCustomer, upload.single('screenshot'), (req, res) => {
  try {
    const { full_name, phone, transaction_id } = req.body;
    if (!full_name || !phone || !transaction_id) {
      return res.status(400).json({ error: 'ሙሉ ስም፣ ስልክ እና የትራንዛክሽን መለያ ያስፈልጋሉ' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'የክፍያ ማረጋገጫ ፎቶ ያስፈልጋል' });
    }
    if (db.findPurchaseByUser(req.session.userId)) {
      return res.status(400).json({ error: 'እርስዎ አስቀድመው መጽሐፉን ገዝተዋል' });
    }
    if (db.findPendingByUser(req.session.userId)) {
      return res.status(400).json({ error: 'አንድ ጥያቄ በመጠባበቅ ላይ ነው። እባክዎ ይጠብቁ።' });
    }
    const reqObj = db.createPaymentRequest({
      user_id: req.session.userId,
      full_name: full_name.trim(),
      phone: phone.trim(),
      transaction_id: transaction_id.trim(),
      screenshot_path: req.file.filename
    });
    res.json({
      success: true,
      message: 'ጥያቄዎ ተልኳል። ክፍያዎ እየተረጋገጠ ነው። ከተፈቀደ በኋላ መጽሐፉን ማውረድ ይችላሉ።',
      id: reqObj.id
    });
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('image')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.get('/api/my-status', requireCustomer, (req, res) => {
  const purchase = db.findPurchaseByUser(req.session.userId);
  const latestRequest = db.findLatestByUser(req.session.userId);
  res.json({
    hasPurchase: !!purchase,
    latestRequest: latestRequest || null
  });
});

app.get('/api/download-book', requireCustomer, (req, res) => {
  const purchase = db.findPurchaseByUser(req.session.userId);
  if (!purchase) {
    return res.status(403).json({ error: 'መጽሐፉን ለማውረድ ክፍያዎ መጽደቅ አለበት' });
  }
  const bookPath = path.join(__dirname, 'books', 'birr-wise-book.pdf');
  if (!fs.existsSync(bookPath)) {
    return res.status(404).json({
      error: 'መጽሐፉ ገና አልተጫነም። PDF ፋይሉን በ books/ አቃፊ ውስጥ ያስቀምጡ።'
    });
  }
  res.download(bookPath, 'በ10ሺ_ብር_ምን_ልስራ.pdf');
});

// ========== ADMIN ==========
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const { status } = req.query;
  const valid = ['PENDING', 'APPROVED', 'REJECTED'];
  const rows = db.listPaymentRequests(valid.includes(status) ? status : null);
  res.json(rows);
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({
    totalApproved: db.countByStatus('APPROVED'),
    totalPending: db.countByStatus('PENDING'),
    totalRejected: db.countByStatus('REJECTED'),
    totalCustomers: db.countCustomers()
  });
});

app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = db.findPaymentRequest(id);
    if (!request) return res.status(404).json({ error: 'ጥያቄ አልተገኘም' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'ይህ ጥያቄ አስቀድሞ ተስተናግዷል' });
    }
    db.updatePaymentRequest(id, { status: 'APPROVED' });
    db.createPurchase({ user_id: request.user_id, payment_request_id: id });
    res.json({ success: true, message: 'ክፍያው ጸድቋል። ደንበኛው መጽሐፉን ማውረድ ይችላል።' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.post('/api/admin/payments/:id/reject', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    const request = db.findPaymentRequest(id);
    if (!request) return res.status(404).json({ error: 'ጥያቄ አልተገኘም' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'ይህ ጥያቄ አስቀድሞ ተስተናግዷል' });
    }
    db.updatePaymentRequest(id, { status: 'REJECTED', admin_note: note || null });
    res.json({ success: true, message: 'ጥያቄው ተቀባይነት አላገኘም' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.get('/api/admin/screenshot/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.sendFile(filePath);
});

app.put('/api/admin/payment-settings', requireAdmin, (req, res) => {
  try {
    const {
      account_name, telebirr_number, telebirr_name,
      bank_name, bank_account, bank_account_name, price, instructions
    } = req.body;
    db.updateSettings({
      account_name, telebirr_number, telebirr_name,
      bank_name, bank_account, bank_account_name,
      price: parseInt(price) || 200, instructions
    });
    res.json({ success: true, message: 'የመክፈያ መረጃ ተዘምኗል' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ስህተት ተፈጥሯል' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ፋይሉ በጣም ትልቅ ነው (ከ5MB በታች መሆን አለበት)' });
    }
  }
  if (err.message && err.message.includes('image')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`\n✅ Birr Wise server running at http://localhost:${PORT}`);
  console.log(`   Admin login: username "neb-admin" | temporary password "BirrWise2026!"`);
  console.log(`   You will be forced to change the password on first login.\n`);
});
