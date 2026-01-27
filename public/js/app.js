const API_URL = 'http://localhost:3001/admin';
let ADMIN_KEY = sessionStorage.getItem('adminKey') || '';

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (ADMIN_KEY) {
        showDashboard();
    }
});

// Auth
function login() {
    const key = document.getElementById('api-key').value;
    if (!key) return alert('Enter key');
    
    // Validate key by trying to fetch users
    ADMIN_KEY = key;
    loadUsers().then(success => {
        if (success) {
            sessionStorage.setItem('adminKey', key);
            showDashboard();
        } else {
            document.getElementById('login-error').innerText = 'Invalid API Key';
            ADMIN_KEY = '';
        }
    });
}

function logout() {
    sessionStorage.removeItem('adminKey');
    location.reload();
}

function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    loadUsers();
}

// API Calls
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
    };
    
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 403) {
            logout();
            alert('Session expired or invalid key');
            return null;
        }
        return res.json();
    } catch (err) {
        console.error(err);
        alert('Network error: Could not connect to server. Ensure backend is running.');
        return null;
    }
}

// Features
async function loadUsers() {
    const users = await fetchAPI('/users');
    if (!users) return false;
    renderTable(users);
    return true;
}

// --- Create User Modal ---
function openCreateModal() {
    document.getElementById('create-username').value = '';
    document.getElementById('user-modal').classList.remove('hidden');
}

function closeCreateModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

async function submitCreateUser() {
    const input = document.getElementById('create-username');
    const username = input.value;
    if (!username) return alert('Username required');

    const res = await fetchAPI('/users', 'POST', { username });
    if (res && res.username) {
        closeCreateModal();
        loadUsers();
    } else {
        alert('Error creating user');
    }
}

// --- Edit User Modal ---
function openEditModal(username, maxDevices, strictMode, expiresAt) {
    document.getElementById('edit-username').value = username;
    document.getElementById('edit-max-devices').value = maxDevices;
    document.getElementById('edit-strict-mode').value = strictMode ? '1' : '0';
    
    // Format date for input type="date" (YYYY-MM-DD)
    if (expiresAt) {
        const date = new Date(expiresAt);
        const dateString = date.toISOString().split('T')[0];
        document.getElementById('edit-expires').value = dateString;
    }

    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function saveUserChanges() {
    const username = document.getElementById('edit-username').value;
    const maxDevices = parseInt(document.getElementById('edit-max-devices').value, 10);
    const strictMode = document.getElementById('edit-strict-mode').value === '1';
    const expiresDate = document.getElementById('edit-expires').value;

    const updates = {
        max_devices: maxDevices,
        strict_ip_mode: strictMode ? 1 : 0
    };

    if (expiresDate) {
        updates.expires_at = expiresDate;
    }

    const res = await fetchAPI(`/users/${username}`, 'PUT', updates);
    if (res) {
        closeEditModal();
        loadUsers();
    } else {
        alert('Error updating user');
    }
}

// --- Delete User Modal ---
function openDeleteModal(username) {
    document.getElementById('delete-username').value = username;
    document.getElementById('delete-username-display').innerText = username;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
}

async function submitDeleteUser() {
    const username = document.getElementById('delete-username').value;
    
    const res = await fetchAPI(`/users/${username}`, 'DELETE');
    if (res) {
        closeDeleteModal();
        loadUsers();
    } else {
        alert('Error deleting user');
    }
}

// --- Helpers & UI ---
async function toggleStatus(username, currentStatus) {
    const newStatus = !currentStatus;
    const res = await fetchAPI(`/users/${username}/status`, 'PUT', { is_active: newStatus });
    if (res) loadUsers();
}

async function regenerateUrl(username) {
    if (!confirm('This will invalidate the old URL. Continue?')) return;
    const res = await fetchAPI(`/users/${username}/regenerate`, 'POST');
    if (res) loadUsers();
}

async function resetDevices(username) {
    if (!confirm('Reset all devices for this user?')) return;
    const res = await fetchAPI(`/users/${username}/reset-devices`, 'POST');
    if (res) alert(res.message);
    loadUsers();
}

function renderTable(users) {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        const btnText = user.is_active ? 'Disable' : 'Enable';
        const btnClass = user.is_active ? 'danger' : 'secondary'; 

        tr.innerHTML = `
            <td><strong>${user.username}</strong></td>
            <td class="${statusClass}">${statusText}</td>
            <td>${user.max_devices}</td>
            <td>${new Date(user.expires_at).toLocaleDateString()}</td>
            <td>
                <div class="url-box">
                    <span class="url-text" title="${user.playlistUrl}">${user.playlistUrl}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${user.playlistUrl}')">Copy</button>
                </div>
            </td>
            <td>
                <div class="action-menu">
                    <button class="${btnClass}" onclick="toggleStatus('${user.username}', ${user.is_active})">${btnText}</button>
                    <button class="secondary" onclick="openEditModal('${user.username}', ${user.max_devices}, ${user.strict_ip_mode})">Edit</button>
                    <button class="danger" onclick="openDeleteModal('${user.username}')">Delete</button>
                    <button class="secondary" onclick="regenerateUrl('${user.username}')">Regen URL</button>
                    <button class="secondary" onclick="resetDevices('${user.username}')">Reset Devs</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Could show a toast here
    });
}
