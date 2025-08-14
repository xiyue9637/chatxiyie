// ==================== 需要替换的配置 ====================
// 🌐 替换为你的 Cloudflare Worker 域名（格式：https://xxx.your-subdomain.workers.dev）
const API_URL = 'https://chat-worker.bin856672.workers.dev';

// 💂‍♂️ 前端写死的管理员密码（必须与 Worker 中的 ADMIN_PASSWORD 一致）
const ADMIN_PASSWORD_FRONTEND = 'adminxiyue';
// =======================================================

let currentUser = null;
let isAdmin = false;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  setAuthMode('login'); // 默认显示登录

  // 绑定 tab 切换事件
  document.getElementById('login-tab').addEventListener('click', () => {
    setAuthMode('login');
  });

  document.getElementById('register-tab').addEventListener('click', () => {
    setAuthMode('register');
  });

  // 登录/注册表单提交
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAuthSubmit();
  });

  // 管理员登录按钮
  document.getElementById('admin-login-btn').addEventListener('click', async () => {
    const pwdInput = document.getElementById('admin-password').value;
    if (pwdInput !== ADMIN_PASSWORD_FRONTEND) {
      document.getElementById('admin-error').textContent = '管理员密码错误';
      return;
    }
    document.getElementById('admin-error').textContent = '';
    isAdmin = true;
    document.getElementById('admin-panel').style.display = 'block';
    loadUserList();
    loadClearTime();
  });

  // 发送消息
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 管理员功能按钮
  document.getElementById('clear-messages-btn').addEventListener('click', clearMessages);
  document.getElementById('clear-time-select').addEventListener('change', setClearTime);
});

// 切换登录/注册界面
function setAuthMode(mode) {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const extraFields = document.getElementById('register-extra');

  loginTab.classList.remove('active');
  registerTab.classList.remove('active');
  if (mode === 'login') {
    loginTab.classList.add('active');
    extraFields.style.display = 'none';
    document.getElementById('auth-form').dataset.mode = 'login';
  } else {
    registerTab.classList.add('active');
    extraFields.style.display = 'block';
    document.getElementById('auth-form').dataset.mode = 'register';
  }
}

// 处理登录/注册提交
async function handleAuthSubmit() {
  const mode = document.getElementById('auth-form').dataset.mode;
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // 清除旧错误
  document.getElementById('auth-error').textContent = '';

  if (!username || !password) {
    document.getElementById('auth-error').textContent = '请填写用户名和密码';
    return;
  }

  if (mode === 'register') {
    const nickname = document.getElementById('nickname').value.trim();
    const avatar = document.getElementById('avatar').value.trim();
    if (!nickname || !avatar) {
      document.getElementById('auth-error').textContent = '请填写昵称和头像URL';
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
      document.getElementById('auth-error').textContent = data.error;
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
      showChat(); // 进入聊天室
    } else {
      document.getElementById('auth-error').textContent = data.error;
    }
  }
}

// 显示聊天界面
function showChat() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('admin-login-screen').style.display = isAdmin ? 'block' : 'none';
  document.getElementById('chat-screen').style.display = 'block';
  document.getElementById('current-username').textContent = currentUser.nickname;

  // 启用输入框
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  input.disabled = false;
  sendBtn.disabled = false;

  // 获取历史消息
  fetchMessages();
  setInterval(fetchMessages, 3000); // 每3秒刷新一次
}

// 获取并渲染消息
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

// 发送消息
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
    fetchMessages(); // 立即刷新
  } else {
    alert(data.error);
  }
}

// 清除聊天记录（管理员）
async function clearMessages() {
  const res = await fetch(`${API_URL}/clear-messages`, { method: 'POST' });
  if (res.ok) {
    fetchMessages();
  } else {
    alert('清除失败');
  }
}

// 设置自动清除时间
async function setClearTime() {
  const time = document.getElementById('clear-time-select').value;
  const res = await fetch(`${API_URL}/set-clear-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time: parseInt(time) })
  });
  if (!res.ok) alert('设置失败');
}

// 加载用户列表
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

// 禁言用户
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

// 移除用户
async function removeUser(username) {
  const res = await fetch(`${API_URL}/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (res.ok) {
    alert(`已移除并注销 ${username}`);
    loadUserList();
  } else {
    alert('操作失败');
  }
}

// 加载自动清除时间
async function loadClearTime() {
  const res = await fetch(`${API_URL}/clear-time`);
  const data = await res.json();
  document.getElementById('clear-time-select').value = data.time || '0';
}

// 简单防止 XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}