// script.js - 前端逻辑
// API 地址已根据您的 Worker 设置
const API_URL = 'https://chat-worker.bin856672.workers.dev';

let currentUser = null;
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
  setAuthMode('login');

  document.getElementById('login-tab').addEventListener('click', () => setAuthMode('login'));
  document.getElementById('register-tab').addEventListener('click', () => setAuthMode('register'));

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAuthSubmit();
  });

  document.getElementById('admin-login-btn').addEventListener('click', async () => {
    const pwd = document.getElementById('admin-password').value;
    if (pwd !== 'adminxiyue') { // 前端写死的管理员密码
      document.getElementById('admin-error').textContent = '密码错误';
      return;
    }
    document.getElementById('admin-error').textContent = '';
    isAdmin = true;
    document.getElementById('admin-panel').style.display = 'block';
    loadUserList();
    loadClearTime();
  });

  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });

  document.getElementById('clear-messages-btn').addEventListener('click', clearMessages);
  document.getElementById('clear-time-select').addEventListener('change', setClearTime);
});

function setAuthMode(mode) {
  document.getElementById('login-tab').classList.toggle('active', mode === 'login');
  document.getElementById('register-tab').classList.toggle('active', mode === 'register');
  document.getElementById('register-extra').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-form').dataset.mode = mode;
}

async function handleAuthSubmit() {
  try {
    const mode = document.getElementById('auth-form').dataset.mode;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = '请输入用户名和密码';
      return;
    }

    if (mode === 'register') {
      const nickname = document.getElementById('nickname').value.trim();
      const avatar = document.getElementById('avatar').value.trim();
      if (!nickname || !avatar) {
        errorEl.textContent = '请填写昵称和头像URL';
        return;
      }

      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname, avatar })
      });

      const data = await res.json();
      if (res.ok) {
        alert('注册成功，请登录');
        setAuthMode('login');
      } else {
        errorEl.textContent = data.error;
      }
    } else {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        currentUser = data.user;
        isAdmin = data.user.role === 'admin';
        showChat();
      } else {
        errorEl.textContent = data.error;
      }
    }
  } catch (err) {
    console.error('请求失败:', err);
    document.getElementById('auth-error').textContent = '网络错误，请检查网络或联系管理员';
  }
}

function showChat() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('admin-login-screen').style.display = isAdmin ? 'block' : 'none';
  document.getElementById('chat-screen').style.display = 'block';
  document.getElementById('current-username').textContent = currentUser.nickname;

  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  input.disabled = false;
  sendBtn.disabled = false;

  fetchMessages();
  setInterval(fetchMessages, 3000);
}

async function fetchMessages() {
  try {
    const res = await fetch(`${API_URL}/messages`);
    const messages = await res.json();
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'message';
      div.innerHTML = `
        <img class="avatar" src="${msg.avatar}" alt="头像" onerror="this.src='https://via.placeholder.com/40'">
        <div>
          <div><strong>${msg.nickname}</strong></div>
          <div class="content">${escapeHtml(msg.message)}</div>
          <div class="info">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
      `;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('获取消息失败:', err);
  }
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;

  const res = await fetch(`${API_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser.username, message: text })
  });

  const data = await res.json();
  if (res.ok) {
    input.value = '';
    fetchMessages();
  } else {
    alert(data.error);
  }
}

async function clearMessages() {
  const res = await fetch(`${API_URL}/clear-messages`, { method: 'POST' });
  if (res.ok) fetchMessages();
  else alert('清除失败');
}

async function setClearTime() {
  const time = document.getElementById('clear-time-select').value;
  const res = await fetch(`${API_URL}/set-clear-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time: parseInt(time) })
  });
  if (!res.ok) alert('设置失败');
}

async function loadUserList() {
  const res = await fetch(`${API_URL}/user-list`);
  const users = await res.json();
  const ul = document.getElementById('user-ul');
  ul.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${user.nickname} (${user.username})
      <div>
        <button onclick="muteUser('${user.username}')">禁言</button>
        <button onclick="removeUser('${user.username}')">移除</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

async function muteUser(username) {
  const res = await fetch(`${API_URL}/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (res.ok) {
    alert(`已禁言 ${username}`);
    loadUserList();
  } else {
    alert('禁言失败');
  }
}

async function removeUser(username) {
  const res = await fetch(`${API_URL}/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (res.ok) {
    alert(`已移除 ${username}`);
    loadUserList();
  } else {
    alert('操作失败');
  }
}

async function loadClearTime() {
  const res = await fetch(`${API_URL}/clear-time`);
  const data = await res.json();
  document.getElementById('clear-time-select').value = data.time || '0';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化为登录模式
setAuthMode('login');