// User data and state management
let currentUser = null;
let currentAction = 'users'; // Default action

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Set current action based on URL parameter
function setCurrentAction() {
    const action = getUrlParameter('action');
    currentAction = action || 'users';

    // Update page content based on action
    updatePageContent();
}

// Update page content based on current action
function updatePageContent() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const pageTitle = document.querySelector('title');

    if (currentAction === 'password') {
        // Change Password Page
        pageTitle.textContent = 'Change Password - GIBSYSNET';
        sidebar.innerHTML = `
            <div class="p-4 border-b">
                <h2 class="font-bold text-lg text-gray-800 flex items-center">
                    <i class="fas fa-key mr-2 text-blue-600"></i> Change Password
                </h2>
            </div>
            <div class="p-4">
                <div class="mb-6">
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">Password Security Tips</h3>
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-2 text-xs"></i>
                            <span>Use at least 8 characters</span>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-2 text-xs"></i>
                            <span>Include uppercase & lowercase letters</span>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-2 text-xs"></i>
                            <span>Add numbers and special characters</span>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-check-circle text-green-500 mt-1 mr-2 text-xs"></i>
                            <span>Avoid common words or patterns</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">Last Password Changes</h3>
                    <div class="space-y-3" id="passwordHistory">
                        <div class="text-center py-4 text-gray-500">
                            <i class="fas fa-history fa-2x mb-2 text-gray-300"></i>
                            <p class="text-sm">No recent changes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        mainContent.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Change Password</h1>
                        <p class="text-gray-600">Update your account password for better security</p>
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-shield-alt mr-2 text-green-500"></i>
                        <span>Secure Connection</span>
                    </div>
                </div>
            </div>

            <div id="successAlert" class="alert alert-success">
                <i class="fas fa-check-circle mr-2"></i>
                <span id="successMessage">Password changed successfully!</span>
            </div>

            <div id="errorAlert" class="alert alert-error">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span id="errorMessage">An error occurred while changing password.</span>
            </div>

            <div class="bg-white rounded-lg shadow p-8 max-w-2xl">
                <form id="passwordForm" class="space-y-6">
                    <div>
                        <label class="form-label">
                            Current Password <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input type="password" id="currentPassword" class="form-input pr-12" placeholder="Enter your current password" required>
                            <button type="button" onclick="togglePassword('currentPassword')" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-eye" id="currentPasswordIcon"></i>
                            </button>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">Enter your current password to verify your identity</p>
                    </div>

                    <div>
                        <label class="form-label">
                            Old Password Hash (Optional)
                        </label>
                        <input type="text" id="oldPasswordHash" class="form-input" placeholder="Enter old password hash if known">
                        <p class="text-sm text-gray-500 mt-1">Leave empty if using current password above</p>
                    </div>

                    <div>
                        <label class="form-label">
                            New Password <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input type="password" id="newPassword" class="form-input pr-12" placeholder="Enter your new password" required oninput="checkPasswordStrength()">
                            <button type="button" onclick="togglePassword('newPassword')" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-eye" id="newPasswordIcon"></i>
                            </button>
                        </div>
                        <div class="password-strength">
                            <div id="passwordStrengthFill" class="password-strength-fill"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-1" id="passwordStrengthText">Password strength: Weak</p>
                    </div>

                    <div>
                        <label class="form-label">
                            New Password Hash (Optional)
                        </label>
                        <input type="text" id="newPasswordHash" class="form-input" placeholder="Enter new password hash if preferred">
                        <p class="text-sm text-gray-500 mt-1">Leave empty if using new password above</p>
                    </div>

                    <div>
                        <label class="form-label">
                            Confirm New Password <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input type="password" id="confirmPassword" class="form-input pr-12" placeholder="Confirm your new password" required oninput="checkPasswordMatch()">
                            <button type="button" onclick="togglePassword('confirmPassword')" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-eye" id="confirmPasswordIcon"></i>
                            </button>
                        </div>
                        <p class="text-sm text-gray-500 mt-1" id="passwordMatchText">Passwords must match</p>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-medium text-blue-800 mb-2">Password Requirements:</h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li id="req-length" class="flex items-center">
                                <i class="fas fa-times text-red-500 mr-2"></i>
                                <span>At least 8 characters long</span>
                            </li>
                            <li id="req-uppercase" class="flex items-center">
                                <i class="fas fa-times text-red-500 mr-2"></i>
                                <span>Contains uppercase letter</span>
                            </li>
                            <li id="req-lowercase" class="flex items-center">
                                <i class="fas fa-times text-red-500 mr-2"></i>
                                <span>Contains lowercase letter</span>
                            </li>
                            <li id="req-number" class="flex items-center">
                                <i class="fas fa-times text-red-500 mr-2"></i>
                                <span>Contains number</span>
                            </li>
                            <li id="req-special" class="flex items-center">
                                <i class="fas fa-times text-red-500 mr-2"></i>
                                <span>Contains special character</span>
                            </li>
                        </ul>
                    </div>

                    <div class="flex justify-end space-x-4 pt-4 border-t">
                        <button type="button" onclick="resetPasswordForm()" class="btn-secondary">
                            <i class="fas fa-undo mr-2"></i>Reset
                        </button>
                        <button type="submit" class="btn-primary" id="submitBtn">
                            <i class="fas fa-save mr-2"></i>Change Password
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-info-circle text-blue-500 text-2xl"></i>
                    </div>
                    <div class="ml-4">
                        <h4 class="font-bold text-blue-800 mb-2">Security Information</h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Your password will be encrypted and stored securely</li>
                            <li>• You will be logged out after changing password for security</li>
                            <li>• Choose a strong password that you haven't used before</li>
                            <li>• Never share your password with anyone</li>
                            <li>• Contact support if you suspect unauthorized access</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Initialize password change functionality
        initializePasswordChange();

    } else {
        // User Management Page (default)
        pageTitle.textContent = 'User Management - GIBSYSNET';
        sidebar.innerHTML = `
            <div class="p-4 border-b">
                <h2 class="font-bold text-lg text-gray-800 flex items-center">
                    <i class="fas fa-users-cog mr-2 text-blue-600"></i> User Management
                </h2>
            </div>

            <div class="p-4">
                <div class="mb-6">
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">Quick Actions</h3>
                    <div class="space-y-2">
                        <button onclick="openAddUserModal()" class="menu-item active flex items-center p-3 rounded-lg w-full text-left">
                            <i class="fas fa-user-plus mr-3 text-green-600"></i>
                            <span>Add New User</span>
                        </button>
                        <button onclick="loadUsers()" class="menu-item flex items-center p-3 rounded-lg w-full text-left">
                            <i class="fas fa-users mr-3 text-blue-600"></i>
                            <span>View All Users</span>
                        </button>
                        <button onclick="exportUsers()" class="menu-item flex items-center p-3 rounded-lg w-full text-left">
                            <i class="fas fa-file-export mr-3 text-purple-600"></i>
                            <span>Export Users</span>
                        </button>
                    </div>
                </div>

                <div>
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">User Statistics</h3>
                    <div class="space-y-3">
                        <div class="bg-white p-3 rounded-lg border">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Total Users</span>
                                <span class="font-bold text-blue-600" id="totalUsers">0</span>
                            </div>
                        </div>
                        <div class="bg-white p-3 rounded-lg border">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Active Users</span>
                                <span class="font-bold text-green-600" id="activeUsers">0</span>
                            </div>
                        </div>
                        <div class="bg-white p-3 rounded-lg border">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Admins</span>
                                <span class="font-bold text-red-600" id="adminUsers">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        mainContent.innerHTML = `
            <div class="mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">User Management</h1>
                        <p class="text-gray-600">Manage system users, roles, and permissions</p>
                    </div>
                    <button onclick="openAddUserModal()" class="btn-primary flex items-center">
                        <i class="fas fa-plus mr-2"></i>
                        Add New User
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-4 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="form-label text-sm">Search</label>
                        <input type="text" id="searchInput" class="form-input" placeholder="Search by name, username, or email">
                    </div>
                    <div>
                        <label class="form-label text-sm">User Level</label>
                        <select id="levelFilter" class="form-input">
                            <option value="">All Levels</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label text-sm">Department</label>
                        <input type="text" id="deptFilter" class="form-input" placeholder="Filter by department">
                    </div>
                    <div class="flex items-end">
                        <button onclick="resetFilters()" class="btn-secondary w-full">
                            <i class="fas fa-undo mr-2"></i>Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="px-6 py-4 border-b">
                    <h3 class="font-semibold text-gray-800">Users List</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="usersTableBody">
                            <!-- Users will be loaded here -->
                        </tbody>
                    </table>
                </div>
                <div class="px-6 py-4 border-t">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-700" id="tableInfo">
                            Showing 0 to 0 of 0 entries
                        </div>
                        <div class="flex space-x-2" id="pagination">
                            <!-- Pagination will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Re-initialize user management functionality
        initializeUserManagement();
    }
}

let usersData = [];
let filteredUsers = [];
let currentPage = 1;
let itemsPerPage = 10;

// Check if user is logged in and has admin access
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('gibsysnet_user'));
    const token = localStorage.getItem('gibsysnet_token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return false;
    }

    // Check if user has admin access
    if (user.user_level !== 'admin' && user.user_level !== 'super_admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'dashboard-user.html';
        return false;
    }

    return user;
}

// Initialize user data
currentUser = checkLogin();

// Update user information in dashboard
function updateUserInfo() {
    if (!currentUser) return;

    // Get initials from full name
    const initials = currentUser.full_name ?
        currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';

    // Update all instances of user info
    document.getElementById('userInitial').textContent = initials.charAt(0);
    document.getElementById('userDisplayName').textContent = currentUser.full_name || 'Admin';
    document.getElementById('menuUserName').textContent = currentUser.full_name || 'Administrator';
    document.getElementById('menuUserEmail').textContent = currentUser.email || 'admin@gibsysnet.com';

    // Update status bar
    document.getElementById('userId').textContent = `ID: ${currentUser.user_id || 'N/A'}`;
    document.getElementById('userFullName').textContent = `User Name: ${currentUser.full_name || 'Admin'}`;
    document.getElementById('userLevel').textContent = `Level: ${(currentUser.user_level || 'admin').toUpperCase()}`;
    document.getElementById('userDept').textContent = currentUser.department || 'Administration';
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const timeOptions = {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };

    document.getElementById('currentDate').textContent =
        now.toLocaleDateString('id-ID', dateOptions);
    document.getElementById('currentTime').textContent =
        now.toLocaleTimeString('id-ID', timeOptions);
}

// Initialize dropdown menus
function initializeDropdowns() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');

    // Toggle user menu
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            notificationDropdown.classList.remove('show');
        });
    }

    // Toggle notification menu
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
            userMenu.classList.remove('show');
        });
    }

    // Toggle other menus
    menuButtons.forEach(button => {
        const container = button.closest('.menu-container');
        const dropdown = container.querySelector('.menu-dropdown');

        button.addEventListener('click', function(e) {
            e.stopPropagation();

            // Close all other dropdowns
            document.querySelectorAll('.menu-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });

            dropdown.classList.toggle('show');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
}

// Load users data
async function loadUsers() {
    try {
        document.getElementById('loadingIndicator').classList.remove('hidden');

        // In a real application, this would be an API call
        // For demo purposes, we'll use mock data
        const mockUsers = [
            {
                id: 1,
                user_id: 'SU001',
                username: 'superadmin',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'Super Administrator',
                email: 'superadmin@gibsysnet.com',
                user_level: 'super_admin',
                department: 'IT',
                phone: '+62 812 3456 7890',
                avatar_url: 'https://via.placeholder.com/40',
                status: 'active',
                created_at: '2024-01-01',
                last_login: '2024-01-30'
            },
            {
                id: 2,
                user_id: 'AD001',
                username: 'admin',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'System Administrator',
                email: 'admin@gibsysnet.com',
                user_level: 'admin',
                department: 'Administration',
                phone: '+62 812 3456 7891',
                avatar_url: 'https://via.placeholder.com/40',
                status: 'active',
                created_at: '2024-01-02',
                last_login: '2024-01-29'
            },
            {
                id: 3,
                user_id: 'MN001',
                username: 'manager',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'Sales Manager',
                email: 'manager@gibsysnet.com',
                user_level: 'manager',
                department: 'Sales',
                phone: '+62 812 3456 7892',
                avatar_url: 'https://via.placeholder.com/40',
                status: 'active',
                created_at: '2024-01-03',
                last_login: '2024-01-28'
            },
            {
                id: 4,
                user_id: 'BR001',
                username: 'broker1',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'John Broker',
                email: 'john.broker@gibsysnet.com',
                user_level: 'broker',
                department: 'Brokerage',
                phone: '+62 812 3456 7893',
                avatar_url: 'https://via.placeholder.com/40',
                status: 'active',
                created_at: '2024-01-04',
                last_login: '2024-01-27'
            },
            {
                id: 5,
                user_id: 'US001',
                username: 'user',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'Regular User',
                email: 'user@gibsysnet.com',
                user_level: 'user',
                department: 'General',
                phone: '+62 812 3456 7894',
                avatar_url: 'https://via.placeholder.com/40',
                status: 'inactive',
                created_at: '2024-01-05',
                last_login: '2024-01-20'
            }
        ];

        usersData = mockUsers;
        filteredUsers = [...usersData];

        updateUserStatistics();
        renderUsersTable();
        renderPagination();

    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users data', 'error');
    } finally {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// Update user statistics
function updateUserStatistics() {
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.status === 'active').length;
    const adminUsers = usersData.filter(u => u.user_level === 'admin' || u.user_level === 'super_admin').length;

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('adminUsers').textContent = adminUsers;
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const usersToShow = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    if (usersToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-users fa-2x mb-2 text-gray-300"></i>
                    <p>No users found</p>
                </td>
            </tr>
        `;
        return;
    }

    usersToShow.forEach(user => {
        const avatarHtml = user.avatar_url ?
            `<img src="${user.avatar_url}" alt="Avatar" class="w-10 h-10 rounded-full object-cover">` :
            `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                ${user.full_name.charAt(0).toUpperCase()}
            </div>`;

        const levelBadgeClass = `user-level-badge badge-${user.user_level.replace('_', '-')}`;
        const statusClass = user.status === 'active' ? 'status-online' : 'status-offline';
        const statusText = user.status === 'active' ? 'Active' : 'Inactive';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    ${avatarHtml}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col">
                        <div class="font-medium text-gray-900">${user.full_name}</div>
                        <div class="text-sm text-gray-500">@${user.username}</div>
                        <div class="text-xs text-gray-400">ID: ${user.user_id}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.email}</div>
                    <div class="text-sm text-gray-500">${user.phone || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="${levelBadgeClass}">${user.user_level.replace('_', ' ').toUpperCase()}</span>
                    <div class="text-sm text-gray-500 mt-1">${user.department || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i class="fas fa-circle ${statusClass} mr-1 text-xs"></i>
                        ${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="editUser(${user.id})" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2"><i class="fas fa-pen mr-1"></i>Edit</button>
                        <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Update pagination info
    document.getElementById('showingFrom').textContent = startIndex + 1;
    document.getElementById('showingTo').textContent = Math.min(endIndex, filteredUsers.length);
    document.getElementById('totalRecords').textContent = filteredUsers.length;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginationControls = document.getElementById('paginationControls');

    if (totalPages <= 1) {
        paginationControls.innerHTML = '';
        return;
    }

    let paginationHtml = '';

    // Previous button
    paginationHtml += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1 text-sm border border-gray-300 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}">Previous</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHtml += `<button class="px-3 py-1 text-sm border border-blue-500 bg-blue-500 text-white rounded">${i}</button>`;
        } else {
            paginationHtml += `<button onclick="changePage(${i})" class="px-3 py-1 text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded">${i}</button>`;
        }
    }

    // Next button
    paginationHtml += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1 text-sm border border-gray-300 rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}">Next</button>`;

    paginationControls.innerHTML = paginationHtml;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderUsersTable();
    renderPagination();
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const levelFilter = document.getElementById('levelFilter').value;
    const deptFilter = document.getElementById('deptFilter').value.toLowerCase();

    filteredUsers = usersData.filter(user => {
        const matchesSearch = !searchTerm ||
            user.full_name.toLowerCase().includes(searchTerm) ||
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm);

        const matchesLevel = !levelFilter || user.user_level === levelFilter;
        const matchesDept = !deptFilter || (user.department && user.department.toLowerCase().includes(deptFilter));

        return matchesSearch && matchesLevel && matchesDept;
    });

    currentPage = 1;
    renderUsersTable();
    renderPagination();
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('deptFilter').value = '';
    applyFilters();
}

// Open add user modal
function openAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userIdHidden').value = '';
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save mr-2"></i>Save User';
    document.getElementById('userModal').style.display = 'block';
}

// Edit user
function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userIdInput').value = user.user_id;
    document.getElementById('usernameInput').value = user.username;
    document.getElementById('passwordInput').value = ''; // Don't show password
    document.getElementById('fullNameInput').value = user.full_name;
    document.getElementById('emailInput').value = user.email;
    document.getElementById('phoneInput').value = user.phone || '';
    document.getElementById('userLevelInput').value = user.user_level;
    document.getElementById('departmentInput').value = user.department || '';
    document.getElementById('avatarUrlInput').value = user.avatar_url || '';
    document.getElementById('userIdHidden').value = user.id;
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save mr-2"></i>Update User';
    document.getElementById('userModal').style.display = 'block';
}

// Close user modal
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const userData = {
                user_id: formData.get('user_id'),
                username: formData.get('username'),
                password_hash: formData.get('password_hash'),
                full_name: formData.get('full_name'),
                email: formData.get('email'),
                user_level: formData.get('user_level'),
                department: formData.get('department'),
                phone: formData.get('phone'),
                avatar_url: formData.get('avatar_url')
            };

            const isEdit = formData.get('id');
            const submitBtn = document.getElementById('submitBtn');

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

                if (isEdit) {
                    // Update existing user
                    const index = usersData.findIndex(u => u.id == isEdit);
                    if (index !== -1) {
                        usersData[index] = { ...usersData[index], ...userData };
                        showNotification('User updated successfully', 'success');
                    }
                } else {
                    // Add new user
                    const newUser = {
                        id: Date.now(), // Simple ID generation
                        ...userData,
                        status: 'active',
                        created_at: new Date().toISOString().split('T')[0],
                        last_login: null
                    };
                    usersData.push(newUser);
                    showNotification('User added successfully', 'success');
                }

                updateUserStatistics();
                applyFilters(); // Re-apply current filters
                closeUserModal();

            } catch (error) {
                console.error('Error saving user:', error);
                showNotification('Error saving user data', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = isEdit ? '<i class="fas fa-save mr-2"></i>Update User' : '<i class="fas fa-save mr-2"></i>Save User';
            }
        });
    }

    // Initialize on page load
    setCurrentAction();
    updateUserInfo();
    updateDateTime();
    initializeDropdowns();

    // Update date and time every second
    setInterval(updateDateTime, 1000);
});

// Delete user
function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    const index = usersData.findIndex(u => u.id === userId);
    if (index !== -1) {
        usersData.splice(index, 1);
        updateUserStatistics();
        applyFilters();
        showNotification('User deleted successfully', 'success');
    }
}

// Export users
function exportUsers() {
    const csvContent = [
        ['User ID', 'Username', 'Full Name', 'Email', 'User Level', 'Department', 'Phone', 'Status', 'Created At'],
        ...filteredUsers.map(user => [
            user.user_id,
            user.username,
            user.full_name,
            user.email,
            user.user_level,
            user.department || '',
            user.phone || '',
            user.status,
            user.created_at
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showNotification('Users exported successfully', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Simple notification - in a real app, you'd use a proper notification system
    alert(`${type.toUpperCase()}: ${message}`);
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('gibsysnet_user');
        localStorage.removeItem('gibsysnet_token');
        window.location.href = 'login.html';
    }
}

// Password change functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');

    // Reset all requirements
    document.querySelectorAll('[id^="req-"]').forEach(req => {
        req.querySelector('i').className = 'fas fa-times text-red-500 mr-2';
    });

    let score = 0;

    // Check length
    if (password.length >= 8) {
        score += 1;
        document.getElementById('req-length').querySelector('i').className = 'fas fa-check text-green-500 mr-2';
    }

    // Check uppercase
    if (/[A-Z]/.test(password)) {
        score += 1;
        document.getElementById('req-uppercase').querySelector('i').className = 'fas fa-check text-green-500 mr-2';
    }

    // Check lowercase
    if (/[a-z]/.test(password)) {
        score += 1;
        document.getElementById('req-lowercase').querySelector('i').className = 'fas fa-check text-green-500 mr-2';
    }

    // Check number
    if (/\d/.test(password)) {
        score += 1;
        document.getElementById('req-number').querySelector('i').className = 'fas fa-check text-green-500 mr-2';
    }

    // Check special character
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 1;
        document.getElementById('req-special').querySelector('i').className = 'fas fa-check text-green-500 mr-2';
    }

    // Update strength indicator
    strengthFill.className = 'password-strength-fill';
    if (score <= 2) {
        strengthFill.classList.add('strength-weak');
        strengthText.textContent = 'Password strength: Weak';
        strengthText.style.color = '#ef4444';
    } else if (score <= 4) {
        strengthFill.classList.add('strength-medium');
        strengthText.textContent = 'Password strength: Medium';
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.classList.add('strength-strong');
        strengthText.textContent = 'Password strength: Strong';
        strengthText.style.color = '#10b981';
    }

    checkPasswordMatch();
}

function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchText = document.getElementById('passwordMatchText');
    const confirmInput = document.getElementById('confirmPassword');

    if (confirmPassword === '') {
        matchText.textContent = 'Passwords must match';
        matchText.style.color = '#6b7280';
        confirmInput.classList.remove('error');
        return;
    }

    if (newPassword === confirmPassword) {
        matchText.textContent = 'Passwords match ✓';
        matchText.style.color = '#10b981';
        confirmInput.classList.remove('error');
    } else {
        matchText.textContent = 'Passwords do not match';
        matchText.style.color = '#ef4444';
        confirmInput.classList.add('error');
    }
}

function resetPasswordForm() {
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) passwordForm.reset();

    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');
    const matchText = document.getElementById('passwordMatchText');

    if (strengthFill) strengthFill.className = 'password-strength-fill';
    if (strengthText) strengthText.textContent = 'Password strength: Weak';
    if (matchText) matchText.textContent = 'Passwords must match';

    // Reset all requirements
    document.querySelectorAll('[id^="req-"]').forEach(req => {
        const icon = req.querySelector('i');
        if (icon) icon.className = 'fas fa-times text-red-500 mr-2';
    });

    // Hide alerts
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');
    if (successAlert) successAlert.style.display = 'none';
    if (errorAlert) errorAlert.style.display = 'none';
}

function showPasswordAlert(type, message) {
    const alertElement = document.getElementById(type + 'Alert');
    const messageElement = document.getElementById(type + 'Message');

    if (alertElement && messageElement) {
        messageElement.textContent = message;
        alertElement.style.display = 'block';

        // Auto-hide success alert after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const oldPasswordHash = document.getElementById('oldPasswordHash').value;
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordHash = document.getElementById('newPasswordHash').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.getElementById('submitBtn');

    // Hide previous alerts
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');
    if (successAlert) successAlert.style.display = 'none';
    if (errorAlert) errorAlert.style.display = 'none';

    // Validate form
    if (!currentPassword && !oldPasswordHash) {
        showPasswordAlert('error', 'Either current password or old password hash is required.');
        return;
    }

    if (!newPassword && !newPasswordHash) {
        showPasswordAlert('error', 'Either new password or new password hash is required.');
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        showPasswordAlert('error', 'New passwords do not match.');
        return;
    }

    if (newPassword && newPassword.length < 8) {
        showPasswordAlert('error', 'New password must be at least 8 characters long.');
        return;
    }

    // If using hash, validate hash format (basic check)
    if (oldPasswordHash && !oldPasswordHash.startsWith('$2b$') && !oldPasswordHash.startsWith('$2a$')) {
        showPasswordAlert('error', 'Old password hash appears to be invalid.');
        return;
    }

    if (newPasswordHash && !newPasswordHash.startsWith('$2b$') && !newPasswordHash.startsWith('$2a$')) {
        showPasswordAlert('error', 'New password hash appears to be invalid.');
        return;
    }

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Changing Password...';
    }

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        showPasswordAlert('success', 'Password changed successfully! You will be logged out for security reasons.');

        // Reset form
        resetPasswordForm();

        // Logout user after 3 seconds
        setTimeout(() => {
            handleLogout();
        }, 3000);

    } catch (error) {
        console.error('Error changing password:', error);
        showPasswordAlert('error', 'Failed to change password. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Change Password';
        }
    }
}

function initializePasswordChange() {
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    loadPasswordHistory();
}

function loadPasswordHistory() {
    const historyContainer = document.getElementById('passwordHistory');

    if (!historyContainer) return;

    // Mock password change history
    const mockHistory = [
        { date: '2024-01-15', time: '14:30', status: 'success' },
        { date: '2023-12-01', time: '09:15', status: 'success' },
        { date: '2023-10-20', time: '16:45', status: 'success' }
    ];

    if (mockHistory.length === 0) return;

    historyContainer.innerHTML = '';

    mockHistory.forEach(item => {
        const statusClass = item.status === 'success' ? 'text-green-600' : 'text-red-600';
        const statusIcon = item.status === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        historyContainer.innerHTML += `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div class="flex items-center">
                    <i class="fas ${statusIcon} ${statusClass} mr-3"></i>
                    <div>
                        <div class="text-sm font-medium text-gray-800">${item.date} at ${item.time}</div>
                        <div class="text-xs text-gray-500">Password changed</div>
                    </div>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">${item.status}</span>
            </div>
        `;
    });
}

// Initialize user management functionality
function initializeUserManagement() {
    loadUsers();

    // Add search input listener
    const searchInput = document.getElementById('searchInput');
    const levelFilter = document.getElementById('levelFilter');
    const deptFilter = document.getElementById('deptFilter');

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (levelFilter) levelFilter.addEventListener('change', applyFilters);
    if (deptFilter) deptFilter.addEventListener('input', applyFilters);
}

// Handle window resize
window.addEventListener('resize', function() {
    // Handle responsive adjustments if needed
});
