// Shared auth helpers
async function getMe() {
  try {
    const res = await fetch('/api/me');
    return await res.json();
  } catch {
    return { loggedIn: false };
  }
}

async function updateNav() {
  const me = await getMe();
  const loginLink = document.getElementById('nav-login');
  const accountLink = document.getElementById('nav-account');
  if (!loginLink) return;

  if (me.loggedIn) {
    loginLink.style.display = 'none';
    if (accountLink) {
      accountLink.style.display = 'inline';
      accountLink.textContent = me.role === 'admin' ? 'Admin' : 'መለያዬ';
      accountLink.href = me.role === 'admin' ? '/admin.html' : '/account.html';
    }
    // Force password change
    if (me.mustChangePassword && !window.location.pathname.includes('change-password')) {
      window.location.href = '/change-password.html';
    }
  } else {
    loginLink.style.display = 'inline';
    if (accountLink) accountLink.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', updateNav);

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
