const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      users: [],
      payment_settings: null,
      payment_requests: [],
      purchases: [],
      nextUserId: 1,
      nextRequestId: 1,
      nextPurchaseId: 1
    };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = load();

if (!db.payment_settings) {
  db.payment_settings = {
    account_name: 'Hanif Sebir Hetib',
    telebirr_number: '0937798081',
    telebirr_name: 'Hanif',
    bank_name: 'CBE',
    bank_account: '1000752299308',
    bank_account_name: 'Hanif Sebir Hetib',
    price: 200,
    instructions: 'ከላይ ካሉት የመክፈያ መንገዶች አንዱን በመጠቀም 200 ብር ይላኩ። ከዚያ የትራንዛክሽን መለያ ቁጥርን እና የክፍያ ማረጋገጫ ፎቶውን ይላኩ።'
  };
  save(db);
}

const adminExists = db.users.some(u => u.role === 'admin');
if (!adminExists) {
  const tempPassword = 'BirrWise2026!';
  const hash = bcrypt.hashSync(tempPassword, 12);
  db.users.push({
    id: db.nextUserId++,
    name: 'Administrator',
    phone: 'neb-admin',
    password_hash: hash,
    role: 'admin',
    must_change_password: true,
    created_at: new Date().toISOString()
  });
  save(db);
  console.log('Admin account created. Username: neb-admin | Temporary password: BirrWise2026!');
  console.log('You will be forced to change the password on first login.');
}

const api = {
  findUserByPhone(phone) {
    return db.users.find(u => u.phone === phone) || null;
  },
  findUserById(id) {
    return db.users.find(u => u.id === id) || null;
  },
  createUser({ name, phone, password_hash, role = 'customer' }) {
    const user = {
      id: db.nextUserId++,
      name,
      phone,
      password_hash,
      role,
      must_change_password: false,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    save(db);
    return user;
  },
  updateUser(id, fields) {
    const user = db.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, fields);
    save(db);
    return user;
  },
  countCustomers() {
    return db.users.filter(u => u.role === 'customer').length;
  },
  getSettings() {
    return db.payment_settings;
  },
  updateSettings(fields) {
    Object.assign(db.payment_settings, fields, { updated_at: new Date().toISOString() });
    save(db);
    return db.payment_settings;
  },
  createPaymentRequest(data) {
    const req = {
      id: db.nextRequestId++,
      ...data,
      status: 'PENDING',
      admin_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.payment_requests.push(req);
    save(db);
    return req;
  },
  findPaymentRequest(id) {
    return db.payment_requests.find(r => r.id === id) || null;
  },
  findPendingByUser(userId) {
    return db.payment_requests.find(r => r.user_id === userId && r.status === 'PENDING') || null;
  },
  findLatestByUser(userId) {
    const list = db.payment_requests.filter(r => r.user_id === userId);
    return list.length ? list.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : null;
  },
  listPaymentRequests(status) {
    let list = db.payment_requests.slice();
    if (status) list = list.filter(r => r.status === status);
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list.map(r => {
      const user = db.users.find(u => u.id === r.user_id);
      return { ...r, user_name: user ? user.name : '' };
    });
  },
  updatePaymentRequest(id, fields) {
    const req = db.payment_requests.find(r => r.id === id);
    if (!req) return null;
    Object.assign(req, fields, { updated_at: new Date().toISOString() });
    save(db);
    return req;
  },
  countByStatus(status) {
    return db.payment_requests.filter(r => r.status === status).length;
  },
  createPurchase({ user_id, payment_request_id }) {
    if (db.purchases.some(p => p.user_id === user_id)) return null;
    const p = {
      id: db.nextPurchaseId++,
      user_id,
      payment_request_id,
      granted_at: new Date().toISOString()
    };
    db.purchases.push(p);
    save(db);
    return p;
  },
  findPurchaseByUser(userId) {
    return db.purchases.find(p => p.user_id === userId) || null;
  }
};

module.exports = api;
