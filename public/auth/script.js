const API = 'https://api.rotur.dev';
let return_to = '';
let account = '';
let savedAccounts = [];
let systemName = 'rotur';
let pendingVerification = null;

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => (ctx || document).querySelectorAll(sel);
const el = id => document.getElementById(id);

function loadSavedAccounts() {
  try {
    const saved = localStorage.getItem('rotur_saved_accounts');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveAccount(data) {
  try {
    let accounts = loadSavedAccounts();
    accounts = accounts.filter(a => a.username !== data.username);
    accounts.unshift({
      username: data.username,
      lastUsed: Date.now(),
      avatar: `https://avatars.rotur.dev/${data.username}`
    });
    accounts = accounts.slice(0, 5);
    localStorage.setItem('rotur_saved_accounts', JSON.stringify(accounts));
    savedAccounts = accounts;
    renderAccountList();
  } catch (e) { }
}

function renderAccountList() {
  const list = el('account-list');
  const accounts = loadSavedAccounts();
  const welcome = el('welcome-area');
  const main = el('main-content');

  if (!accounts.length) {
    list.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-tertiary);"><div style="font-size:2.5rem;margin-bottom:0.75rem;"><i class="fas fa-user-circle"></i></div><p style="margin:0;font-weight:500;color:var(--text-secondary);">No saved accounts</p><p style="margin:0.25rem 0 0;font-size:0.8rem;">Sign in to save your account</p></div>`;
    el('add-account-btn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign in';
    return;
  }

  welcome.classList.remove('hidden');
  main.classList.remove('show');

  list.innerHTML = accounts.map(a => `<button class="account-item" data-username="${a.username}"><img src="${a.avatar}" alt="${a.username}" onerror="this.src='../Rotur Logo.png'"><div class="account-item-info"><h3>${a.username}</h3><p>Rotur Account</p></div></button>`).join('');

  list.querySelectorAll('.account-item').forEach(item => {
    item.addEventListener('click', () => selectSavedAccount(item.dataset.username));
  });
}

function loadStylesheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const stylesUrl = urlParams.get('styles') || './auth.css';

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesUrl;
  document.head.appendChild(link);
}

function selectSavedAccount(username) {
  showSignInForm();
  const accounts = loadSavedAccounts();
  const saved = accounts.find(a => a.username === username);
  $('input[name="username"]').value = username;
  $('input[name="password"]').focus();
  $('input[name="password"]').placeholder = 'Enter your password';
}

function showSignInForm() {
  el('welcome-area').classList.add('hidden');
  el('main-content').classList.add('show');
  el('signin-form').style.display = 'block';
  el('signup-form').style.display = 'none';
  $('.sidebar-header').innerHTML = '<h2>Sign in</h2><p>to continue to Rotur</p>';
  el('add-account-btn').innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  $('input[name="username"]').value = '';
  $('input[name="password"]').value = '';
  $('input[name="password"]').placeholder = 'Password';
  $$('.account-item').forEach(i => i.classList.remove('active'));
}

function showSignUpForm() {
  el('welcome-area').classList.add('hidden');
  el('main-content').classList.add('show');
  el('signin-form').style.display = 'none';
  el('signup-form').style.display = 'block';
  $('.sidebar-header').innerHTML = '<h2>Create account</h2><p>Join Rotur today</p>';
  el('add-account-btn').innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  $('input[name="username"]', el('signup-form')).value = '';
  $('input[name="email"]', el('signup-form')).value = '';
  $('input[name="password"]', el('signup-form')).value = '';
  $('input[name="confirm-password"]', el('signup-form')).value = '';
}

function showWelcome() {
  el('welcome-area').classList.remove('hidden');
  el('main-content').classList.remove('show');
  $('.sidebar-header').innerHTML = '<h2>Choose an account</h2><p>to continue to Rotur</p>';
  el('add-account-btn').innerHTML = '<i class="fas fa-user-plus"></i> Use another account';
}

function setCookie(n, v, days) {
  const d = new Date(Date.now() + days * 864e5);
  document.cookie = `${n}=${encodeURIComponent(v)};expires=${d.toUTCString()};path=/;Secure;SameSite=Strict`;
}

function getCookie(n) {
  const m = document.cookie.match(new RegExp('(^| )' + n + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : '';
}

function showLoading() {
  el('loading-overlay').style.display = 'flex';
}
function hideLoading() {
  el('loading-overlay').style.display = 'none';
}

function updateModalForLoggedInUser() {
  if (!checkTOSAcceptance(account)) return;

  const content = $('.modal-content');
  content.innerHTML = `
    <div class="account-sidebar">
      <div class="sidebar-header">
        <h2>Account Access</h2>
        <p>Choose account to continue</p>
      </div>
      <div class="account-list">
        <button class="account-item active">
          <img src="https://avatars.rotur.dev/${account.username}" onerror="this.src='../Rotur Logo.png'">
          <div class="account-item-info">
            <h3>${account.username}</h3>
            <p>Rotur Account</p>
          </div>
        </button>
      </div>
      <button class="add-account-btn" id="logoutButton"><i class="fas fa-user-plus"></i> Use another account</button>
    </div>
    <div class="main-content show">
      <div class="logo-container"><img src="../Rotur Logo.png" draggable="false"></div>
      <h1>Continue as ${account.username}</h1>
      <p class="subtitle">${return_to || 'This website'} is requesting access</p>
      <div class="security-notice">
        <i class="fas fa-info-circle warning-icon" style="color:var(--text-secondary)"></i>
        <div>
          <strong>Access Request</strong>
          <p>Only proceed if you trust this website.</p>
        </div>
      </div>
      <div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem;width:100%;max-width:280px;">
        <button id="allowAccess" class="btn-primary">Continue</button>
        <button id="cancelAccess" class="btn-secondary">Cancel</button>
      </div>
      <div class="tos-links"><p><a href="../privacy-policy?from=auth">Privacy Policy</a> • <a href="../terms-of-service?from=auth">Terms of Service</a></p></div>
    </div>`;

  el('allowAccess').addEventListener('click', () => {
    if (account.key) {
      saveAccount(account);
      if (window.opener) window.opener.postMessage({ type: 'rotur-auth-token', token: account.key }, '*');
      if (window.parent !== window) window.parent.postMessage({ type: 'rotur-auth-token', token: account.key }, '*');
      const ref = new URL(return_to);
      ref.searchParams.set('token', account.key);
      location.href = ref.toString();
    }
  });

  el('logoutButton').addEventListener('click', () => {
    document.cookie = 'username=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
    location.reload();
  });

  el('cancelAccess').addEventListener('click', () => history.back());
}

async function submitLinkCode(e) {
  e.preventDefault();
  const overlay = el('link-overlay');
  const inputs = $$('input[data-idx]', overlay);
  const code = Array.from(inputs).map(i => i.value).join('');
  const err = el('link-error');
  if (code.length !== 6) {
    err.textContent = 'Enter the full 6-character code';
    err.style.display = 'block';
    return;
  }
  try {
    const res = await fetch(`${API}/link/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, token: account.key })
    });
    const data = await res.json();
    if (data.success) {
      setTimeout(() => overlay.remove(), 800);
    } else {
      throw new Error(data.error || 'Failed');
    }
  } catch (ex) {
    err.textContent = 'Link failed: ' + ex.message;
    err.style.display = 'block';
  }
}

function handleCredential(response) {
  fetch(`${API}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: response.credential, system: systemName })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }
      account = data;
      updateModalForLoggedInUser();
    });
}

async function requestAccount(username, password) {
  const res = await fetch(`${API}/get_user?username=${username}&password=${password}`);
  const json = await res.json();
  if (json.error) {

    if (json.error.includes('Terms-Of-Service') && json.token) {
      return { error: json.error, key: json.token, username, 'sys.tos_accepted': false, requiresTOSAcceptance: true };
    }

    if (json.error === 'Email address not verified' && json.token) {
      return { error: json.error, token: json.token, username: json.username, requiresEmailVerification: true };
    }

    return { error: json.error };
  }
  return json;
}

function showEmailVerificationUI(info) {
  pendingVerification = { token: info.token, username: info.username };
  const signinForm = el('signin-form');
  const verifyPrompt = el('email-verify-prompt');
  const verifyAddr = el('verify-email-address');
  const verifyMsg = el('verify-msg');
  if (signinForm) signinForm.style.display = 'none';
  if (verifyPrompt) verifyPrompt.style.display = 'block';
  if (verifyAddr) verifyAddr.textContent = info.username;
  if (verifyMsg) verifyMsg.style.display = 'none';
}

async function verifyDone() {
  if (!pendingVerification) return;
  const { token } = pendingVerification;
  try {
    const res = await fetch(`${API}/me?auth=${token}`);
    const data = await res.json();
    if (data['sys.email_verified']) {
      account = data;
      saveAccount(data);
      updateModalForLoggedInUser();
      el('email-verify-prompt').style.display = 'none';
      pendingVerification = null;
    } else {
      el('verify-msg').textContent = 'Email still not verified. Please check your inbox.';
      el('verify-msg').style.display = 'block';
    }
  } catch (e) {
    console.error('verifyDone error:', e);
    const msgEl = el('verify-msg');
    if (msgEl) {
      msgEl.textContent = 'Error checking verification.';
      msgEl.style.display = 'block';
    }
  }
}

async function verifyResend() {
  if (!pendingVerification) return;
  const { token } = pendingVerification;
  try {
    const res = await fetch(`${API}/me/resend_verification?auth=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const msgEl = el('verify-msg');
    if (msgEl) {
      msgEl.textContent = data.message || 'Verification email sent.';
      msgEl.style.display = 'block';
    }
  } catch (e) {
    console.error('verifyResend error:', e);
    const msgEl = el('verify-msg');
    if (msgEl) {
      msgEl.textContent = 'Failed to resend email.';
      msgEl.style.display = 'block';
    }
  }
}

function verifyCancel() {
  pendingVerification = null;
  el('email-verify-prompt').style.display = 'none';
  el('signin-form').style.display = 'block';
}

function verifyTokenAndProceed(token) {
  const returnTo = return_to;
  
  if (window.opener || window.parent !== window) {
    if (window.opener) {
      window.opener.postMessage({ type: 'rotur-auth-token', token: token, return_to: returnTo }, '*');
      setTimeout(() => window.close(), 300);
    } else {
      window.parent.postMessage({ type: 'rotur-auth-token', token: token, return_to: returnTo }, '*');
    }
    return;
  }
  
  const finalUrl = new URL(returnTo);
  finalUrl.searchParams.set('token', token);
  location.href = finalUrl.toString();
}

function checkTOSAcceptance(data) {
  if (`${data['sys.tos_accepted']}` !== 'true') {
    if (return_to) sessionStorage.setItem('rotur_return_to', return_to);
    const url = new URL('../terms-of-service', location.href);
    url.searchParams.set('token', data.key);
    location.href = url.toString();
    return false;
  }
  return true;
}

window.addEventListener('load', () => {
  loadStylesheet();
  
  savedAccounts = loadSavedAccounts();
  renderAccountList();

  const params = new URLSearchParams(location.search);
  const savedReturnTo = sessionStorage.getItem('rotur_return_to');
  return_to = params.get('return_to') ?? savedReturnTo ?? 'https://rotur.dev/me';
  const systemParam = params.get('system');
  if (systemParam?.trim()) systemName = systemParam.trim();
  sessionStorage.removeItem('rotur_return_to');
  
  const tokenParam = params.get('token');
  if (tokenParam) {
    verifyTokenAndProceed(tokenParam);
    return;
  }

  el('add-account-btn').addEventListener('click', () => {
    const main = el('main-content');
    if (main.classList.contains('show')) {
      showWelcome();
    } else {
      showSignInForm();
    }
  });

  el('welcome-signin-btn').addEventListener('click', showSignInForm);
  el('welcome-signup-btn').addEventListener('click', showSignUpForm);
  el('show-signup-btn').addEventListener('click', showSignUpForm);
  el('show-signin-btn').addEventListener('click', showSignInForm);
  el('alt-signin-btn').addEventListener('click', () => {
    el('google-signin-container').classList.toggle('show');
  });


  const verifyDoneBtn = el('verify-done-btn');
  if (verifyDoneBtn) verifyDoneBtn.addEventListener('click', verifyDone);
  const verifyResendBtn = el('verify-resend-btn');
  if (verifyResendBtn) verifyResendBtn.addEventListener('click', verifyResend);
  const verifyCancelBtn = el('verify-cancel-btn');
  if (verifyCancelBtn) verifyCancelBtn.addEventListener('click', verifyCancel);

  el('signin-form-element').addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    const btn = $('button[type="submit"]', el('signin-form-element'));
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    btn.disabled = true;

    const username = $('input[name="username"]', el('signin-form-element')).value;
    const password = $('input[name="password"]', el('signin-form-element')).value;
    const hash = CryptoJS.MD5(password).toString();

    setCookie('username', username, 7);

    try {
      const data = await requestAccount(username, hash);
      if (!data.error) {
        account = data;
        saveAccount(data);
        updateModalForLoggedInUser();
      } else {

        if (data.requiresTOSAcceptance) {
          const url = new URL('../terms-of-service', location.href);
          url.searchParams.set('token', data.key);
          if (return_to) url.searchParams.set('return_to', return_to);
          location.href = url.toString();
          return;
        }

        if (data.requiresEmailVerification) {
          showEmailVerificationUI(data);
          btn.disabled = false;
          btn.textContent = 'Sign in';
          return;
        }
        btn.textContent = data.error || 'Invalid credentials';
        btn.style.background = 'var(--danger)';
        setTimeout(() => {
          btn.textContent = 'Sign in';
          btn.style.background = '';
          btn.disabled = false;
        }, 2000);
      }
    } catch (ex) {
      btn.textContent = 'Error occurred';
      btn.style.background = 'var(--danger)';
      setTimeout(() => {
        btn.textContent = 'Sign in';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  });

  el('signup-form-element').addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    console.log('signup form submitted');
    const signupForm = el('signup-form-element');
    const btn = $('button[type="submit"]', signupForm);
    const username = $('input[name="username"]', signupForm).value;
    const email = $('input[name="email"]', signupForm).value;
    const password = $('input[name="password"]', signupForm).value;
    const confirm = $('input[name="confirm-password"]', signupForm).value;
    console.log('username:', username, 'email:', email);

    const htoken = hcaptcha.getResponse();
    if (!htoken) {
      btn.textContent = 'Complete the captcha';
      btn.style.background = 'var(--danger)';
      setTimeout(() => {
        btn.textContent = 'Create Account';
        btn.style.background = '';
      }, 2000);
      return;
    }
    if (password !== confirm) {
      btn.textContent = 'Passwords do not match';
      btn.style.background = 'var(--danger)';
      hcaptcha.reset();
      setTimeout(() => {
        btn.textContent = 'Create Account';
        btn.style.background = '';
      }, 2000);
      return;
    }
    if (password.length < 8) {
      btn.textContent = 'Password must be 8+ characters';
      btn.style.background = 'var(--danger)';
      hcaptcha.reset();
      setTimeout(() => {
        btn.textContent = 'Create Account';
        btn.style.background = '';
      }, 2000);
      return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
      const hash = CryptoJS.MD5(password).toString();
      const res = await fetch(`${API}/create_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: hash, system: systemName, captcha: htoken })
      });
      const result = await res.json();

      if (result.error) {
        hcaptcha.reset();
        btn.textContent = result.error;
        btn.style.background = 'var(--danger)';
        setTimeout(() => {
          btn.textContent = 'Create Account';
          btn.style.background = '';
          btn.disabled = false;
        }, 2000);
      } else {
        setCookie('username', username, 7);
        const data = await requestAccount(username, hash);
        if (!data.error) {
          account = data;
          saveAccount(data);
          updateModalForLoggedInUser();
        } else {
          if (data.requiresTOSAcceptance) {
            const url = new URL('../terms-of-service', location.href);
            url.searchParams.set('token', data.key);
            if (return_to) url.searchParams.set('return_to', return_to);
            location.href = url.toString();
            return;
          }
          btn.textContent = 'Account created! Please sign in';
          btn.style.background = 'var(--success)';
          setTimeout(() => {
            showSignInForm();
            $('input[name="username"]').value = username;
            $('input[name="password"]').focus();
          }, 1500);
        }
      }
    } catch (ex) {
      hcaptcha.reset();
      btn.textContent = 'Error occurred';
      btn.style.background = 'var(--danger)';
      setTimeout(() => {
        btn.textContent = 'Create Account';
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
  });

  const username = getCookie('username');
  if (username) {
    setTimeout(() => {
      const inp = $('input[name="username"]', el('signin-form'));
      if (inp) {
        inp.value = username;
        showSignInForm();
        $('input[name="password"]').focus();
      }
    }, 100);
  }
});
