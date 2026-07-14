// assets/js/layout-loader.js
(function() {
    const ROLE_DEFAULT_PERMS = {
        super_admin: ['signin','signout','exit','company','partners','cob','subcob','currency','default_quotation','model_risks','occupations','class_construction','coverage','object_group','contribution','production_target','quotation','quotation_reg','renewal_quotation','endorsement_quotation','closed_quotations','delete_quotation','rollback_quotation','note','monthly_production','renewal_reminder','renewal_notice','premium_earned','e_reporting','sippo','sprint','apolo','sigap','sipesat','apparindo','siap_apari','ojk','change_password','user_management','log_on_local','upload_local','usage_help','documentation','contact_support'],
        admin: ['company','partners','cob','subcob','currency','default_quotation','model_risks','occupations','class_construction','coverage','object_group','contribution','production_target','quotation','quotation_reg','renewal_quotation','endorsement_quotation','closed_quotations','delete_quotation','rollback_quotation','note','monthly_production','renewal_reminder','renewal_notice','premium_earned','change_password','user_management'],
        manager: ['company','partners','cob','subcob','currency','default_quotation','model_risks','occupations','class_construction','coverage','object_group','contribution','production_target','quotation','quotation_reg','renewal_quotation','endorsement_quotation','closed_quotations','note','monthly_production','renewal_reminder','renewal_notice','premium_earned'],
        broker: ['partners','quotation','quotation_reg','renewal_quotation','endorsement_quotation','note'],
        user: ['quotation']
    };

    const PAGE_PERMISSIONS = {
        'company.html': 'company',
        'partners.html': 'partners',
        'cob.html': 'cob',
        'subcob.html': 'subcob',
        'currency.html': 'currency',
        'defaultquotation.html': 'default_quotation',
        'modelriskbaru.html': 'model_risks',
        'occupations.html': 'occupations',
        'class.html': 'class_construction',
        'coverages.html': 'coverage',
        'objectgroup.html': 'object_group',
        'commission.html': 'contribution',
        'target.html': 'production_target',
        'quotation.html': 'quotation_reg',
        'transactions.html': 'quotation',
        'reports.html': 'monthly_production',
        'users.html': 'user_management',
        'administration.html': 'change_password'
    };

    function applyMenuPermissions() {
        const userData = sessionStorage.getItem('gibsysnet_user') || localStorage.getItem('gibsysnet_user');
        const user = userData ? JSON.parse(userData) : null;
        if (!user) return;

        let permissions = user.permissions;
        if (!permissions && user.menu_access) {
            permissions = typeof user.menu_access === 'string' ? JSON.parse(user.menu_access) : user.menu_access;
        }
        if (!Array.isArray(permissions)) {
            permissions = ROLE_DEFAULT_PERMS[user.user_level] || ROLE_DEFAULT_PERMS['user'];
        }
        if (user.user_level === 'super_admin') {
            permissions = ROLE_DEFAULT_PERMS.super_admin;
        }

        // Hide links in menu-bar
        const menuLinks = document.querySelectorAll('#menu-bar-container [data-perm]');
        menuLinks.forEach(link => {
            const perm = link.getAttribute('data-perm');
            if (permissions.indexOf(perm) === -1) {
                link.style.display = 'none';
            } else {
                link.style.display = '';
            }
        });

        // Hide parent dropdown if no visible links
        const dropdownContainers = document.querySelectorAll('#menu-bar-container .menu-container');
        dropdownContainers.forEach(container => {
            const links = container.querySelectorAll('[data-perm]');
            if (links.length > 0) {
                let hasVisibleLink = false;
                links.forEach(l => {
                    if (l.style.display !== 'none') {
                        hasVisibleLink = true;
                    }
                });
                if (!hasVisibleLink) {
                    container.style.display = 'none';
                } else {
                    container.style.display = '';
                }
            }
        });

        // Page level check
        const path = window.location.pathname;
        const page = path.split('/').pop().toLowerCase();
        const requiredPerm = PAGE_PERMISSIONS[page];
        if (requiredPerm && permissions.indexOf(requiredPerm) === -1) {
            alert('Akses Ditolak: Anda tidak memiliki izin untuk membuka halaman ini.');
            window.location.replace('index.html');
        }
    }

    function loadComponentSync(targetId, componentUrl) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', componentUrl, false); // synchronous XHR
            xhr.send(null);
            if (xhr.status === 200) {
                target.innerHTML = xhr.responseText;
            } else {
                console.error(`Failed to load ${componentUrl}: ${xhr.statusText}`);
            }
        } catch (e) {
            console.error(`Error loading ${componentUrl}:`, e);
        }
    }

    // 1. Synchronously fetch and inject HTML
    loadComponentSync('menu-bar-container', 'components/menu-bar.html');
    loadComponentSync('status-bar-container', 'components/header.html');
    loadComponentSync('sidebar-container', 'components/sidebar.html');
    loadComponentSync('footer-container', 'components/footer.html');

    // Apply permissions immediately after loading components
    applyMenuPermissions();

    // 2. Configure sidebar dynamic title/icon/type
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        const title = sidebarContainer.getAttribute('data-title') || 'Management';
        const icon = sidebarContainer.getAttribute('data-icon') || 'fas fa-layer-group';
        const type = sidebarContainer.getAttribute('data-type') || 'master';

        const titleText = document.getElementById('sidebar-title-text');
        const titleIcon = document.getElementById('sidebar-title-icon');
        if (titleText) titleText.textContent = title;
        if (titleIcon) {
            titleIcon.className = `${icon} mr-2 text-blue-600`;
        }

        if (type === 'dashboard') {
            const dbMenu = document.getElementById('sidebar-menu-dashboard');
            if (dbMenu) dbMenu.classList.remove('hidden');
        } else {
            const masterMenu = document.getElementById('sidebar-menu-master');
            if (masterMenu) masterMenu.classList.remove('hidden');
        }
    }

    // 3. Define handleLogout globally
    window.handleLogout = function() {
        if (window.Auth && typeof window.Auth.logout === 'function') {
            window.Auth.logout();
        }
        localStorage.removeItem('gibsysnet_token');
        localStorage.removeItem('gibsysnet_user');
        sessionStorage.removeItem('gibsysnet_token');
        sessionStorage.removeItem('gibsysnet_user');
        window.location.href = 'login.html';
    };

    // 4. Update status-bar user info from localStorage and API
    window.updateStatusBarUserInfo = function() {
        const userData = sessionStorage.getItem('gibsysnet_user') || localStorage.getItem('gibsysnet_user');
        const user = userData ? JSON.parse(userData) : null;

        const userId = document.getElementById('userId');
        const userFullName = document.getElementById('userFullName');
        const userUsername = document.getElementById('userUsername');
        const userLevel = document.getElementById('userLevel');
        const userDept = document.getElementById('userDept');
        const userInitial = document.getElementById('userInitial');
        const userDisplayName = document.getElementById('userDisplayName');
        const menuUserName = document.getElementById('menuUserName');
        const menuUserEmail = document.getElementById('menuUserEmail');

        function renderUser(userData) {
            const fullName = userData?.fullname || userData?.full_name || 'Administrator';
            const username = userData?.username || '';
            const email = userData?.email || 'admin@gibsysnet.com';
            
            let level = (userData?.user_level || 'admin').toUpperCase();
            if (userData?.role_id !== undefined) {
                const roleMap = { 1: 'SUPER ADMIN', 2: 'ADMIN', 3: 'MANAGER', 4: 'BROKER', 5: 'USER' };
                level = roleMap[userData.role_id] || level;
            }
            
            const department = userData?.department || 'Administration';
            const id = userData?.id || userData?.user_id || 'N/A';

            if (userId) userId.textContent = `ID: ${id}`;
            if (userFullName) userFullName.textContent = `User Name: ${fullName}`;
            if (userUsername) userUsername.textContent = `Username: ${username}`;
            if (userLevel) userLevel.textContent = `Level: ${level}`;
            if (userDept) userDept.textContent = department;
            if (userDisplayName) userDisplayName.textContent = fullName;
            if (menuUserName) menuUserName.textContent = fullName;
            if (menuUserEmail) menuUserEmail.textContent = email;

            if (userInitial) {
                const initials = fullName.split(' ').map((name) => name[0]).join('').toUpperCase();
                userInitial.textContent = initials.charAt(0) || 'A';
            }
        }

        if (user) {
            // Render local cache first
            renderUser(user);

            // Fetch latest user details from API
            const token = sessionStorage.getItem('gibsysnet_token') || localStorage.getItem('gibsysnet_token');
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;

            fetch('http://localhost:3001/api/users', { headers })
                .then(res => res.json())
                .then(responseObj => {
                    let usersList = [];
                    if (Array.isArray(responseObj.data)) {
                        usersList = responseObj.data;
                    } else if (Array.isArray(responseObj.message)) {
                        usersList = responseObj.message;
                    } else if (Array.isArray(responseObj)) {
                        usersList = responseObj;
                    }

                    const currentId = user.id || user.user_id;
                    const matched = usersList.find(u => u.id === currentId || u.username === user.username);
                    if (matched) {
                        const level = matched.role_id === 1 ? 'super_admin' : (matched.role_id === 2 ? 'admin' : (matched.role_id === 3 ? 'manager' : (matched.role_id === 4 ? 'broker' : 'user')));
                        let matchedPerms = matched.menu_access;
                        if (typeof matchedPerms === 'string') {
                            try { matchedPerms = JSON.parse(matchedPerms); } catch (e) { matchedPerms = []; }
                        }
                        if (!Array.isArray(matchedPerms)) {
                            matchedPerms = ROLE_DEFAULT_PERMS[level] || [];
                        }

                        const updatedUser = {
                            id: matched.id,
                            username: matched.username,
                            full_name: matched.fullname,
                            email: matched.email,
                            department: matched.department,
                            user_level: level,
                            role_id: matched.role_id,
                            permissions: matchedPerms
                        };
                        
                        renderUser(updatedUser);

                        // Save updated data to sessionStorage/localStorage
                        const store = localStorage.getItem('gibsysnet_user') ? localStorage : sessionStorage;
                        store.setItem('gibsysnet_user', JSON.stringify(updatedUser));

                        // Re-apply menu permissions after sync
                        applyMenuPermissions();
                    }
                })
                .catch(err => {
                    console.error('Error syncing user info from server:', err);
                });
        }
    };

    // 5. Initialize layout interactions (menus, clock, etc.)
    function initializeLayoutInteractions() {
        const menuButtons = document.querySelectorAll('.menu-btn');
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenu = document.getElementById('userMenu');
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');
        const currentDate = document.getElementById('currentDate');
        const currentTime = document.getElementById('currentTime');

        function updateDateTime() {
            const now = new Date();
            if (currentDate) {
                currentDate.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            if (currentTime) {
                currentTime.textContent = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }

        if (userMenuBtn && userMenu) {
            userMenuBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                userMenu.classList.toggle('show');
                if (notificationDropdown) notificationDropdown.classList.remove('show');
            });
        }

        if (notificationBtn && notificationDropdown) {
            notificationBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                notificationDropdown.classList.toggle('show');
                if (userMenu) userMenu.classList.remove('show');
            });
        }

        menuButtons.forEach(button => {
            const container = button.closest('.menu-container');
            if (!container) return;
            const dropdown = container.querySelector('.menu-dropdown');
            if (!dropdown) return;

            button.addEventListener('click', function (event) {
                event.stopPropagation();
                document.querySelectorAll('.menu-dropdown').forEach(menu => {
                    if (menu !== dropdown) menu.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
        });

        document.addEventListener('click', function () {
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => dropdown.classList.remove('show'));
        });

        // Initialize copyright year in footer if main.js is loaded
        const yearElements = document.querySelectorAll('[data-current-year]');
        if (yearElements.length > 0) {
            const currentYear = new Date().getFullYear();
            yearElements.forEach(el => {
                el.textContent = currentYear;
            });
        }


        updateDateTime();
        window.updateStatusBarUserInfo();
        setInterval(updateDateTime, 1000);
    }

    // Run layout interactions when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLayoutInteractions);
    } else {
        initializeLayoutInteractions();
    }
})();
