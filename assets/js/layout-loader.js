// assets/js/layout-loader.js
(function() {
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
            return;
        }
        localStorage.removeItem('gibsysnet_token');
        localStorage.removeItem('gibsysnet_user');
        window.location.href = 'login.html';
    };

    // 4. Update status-bar user info from localStorage
    window.updateStatusBarUserInfo = function() {
        const userData = localStorage.getItem('gibsysnet_user');
        const user = userData ? JSON.parse(userData) : null;

        const userId = document.getElementById('userId');
        const userFullName = document.getElementById('userFullName');
        const userLevel = document.getElementById('userLevel');
        const userDept = document.getElementById('userDept');
        const userInitial = document.getElementById('userInitial');
        const userDisplayName = document.getElementById('userDisplayName');
        const menuUserName = document.getElementById('menuUserName');
        const menuUserEmail = document.getElementById('menuUserEmail');

        const fullName = user?.full_name || 'Administrator';
        const email = user?.email || 'admin@gibsysnet.com';
        const level = (user?.user_level || 'admin').toUpperCase();
        const department = user?.department || 'Administration';
        const id = user?.user_id || 'N/A';

        if (userId) userId.textContent = `ID: ${id}`;
        if (userFullName) userFullName.textContent = `User Name: ${fullName}`;
        if (userLevel) userLevel.textContent = `Level: ${level}`;
        if (userDept) userDept.textContent = department;
        if (userDisplayName) userDisplayName.textContent = fullName;
        if (menuUserName) menuUserName.textContent = fullName;
        if (menuUserEmail) menuUserEmail.textContent = email;

        if (userInitial) {
            const initials = fullName.split(' ').map((name) => name[0]).join('').toUpperCase();
            userInitial.textContent = initials.charAt(0) || 'A';
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
