# Birr Wise – Digital Book Selling Platform

Full working system for selling the book **በ10ሺ ብር ምን ልስራ?**

## Features

- Customer registration & login
- Manual payment (Telebirr + CBE) with screenshot upload
- Admin dashboard to approve/reject payments
- Book download only after admin approval
- Admin can change payment details and price
- First-login password change for admin
- Existing elegant design preserved

## Payment details (default)

- **Price:** 200 Birr
- **Telebirr:** 0937798081 (Hanif)
- **CBE:** 1000752299308 (Hanif Sebir Hetib)

## Admin login

- **Username:** `neb-admin`
- **Temporary password:** `BirrWise2026!`
- You will be forced to change the password on first login.

## How to run (on your computer)

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Open terminal in this folder and run:

```bash
npm install
npm start
```

### 3. Open browser
Go to: http://localhost:3000

### 4. Put your real book PDF
Copy your PDF file into the `books/` folder and name it:

```
books/birr-wise-book.pdf
```

Only customers whose payment is approved can download it.

## Deploy (so customers can use it)

You need a host that supports Node.js (not Netlify Drop):

Recommended free/cheap options:
- **Railway.app** (easiest)
- **Render.com**
- **Fly.io**

Steps for Railway:
1. Create account at railway.app
2. New Project → Deploy from local folder (or GitHub)
3. It will run `npm install` and `npm start` automatically
4. You get a public URL to put on TikTok

## Folder structure

```
birr-wise-book/
├── server.js          ← main backend
├── db.js              ← database (JSON file)
├── package.json
├── public/            ← website pages + design
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── account.html
│   ├── admin.html
│   └── ...
├── books/             ← put your PDF here
├── uploads/           ← payment screenshots (auto)
└── data/              ← database file (auto)
```

## Important

- Do NOT put the real book PDF in the `public/` folder.
- Only approved customers can download via `/api/download-book`.
- Admin credentials are never exposed in frontend JavaScript.
