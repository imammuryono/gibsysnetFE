(function initializeProfessionalLayout() {
    const menuBarHtml = `
        <div class="menu-bar text-white">
            <div class="flex items-center justify-between h-full px-4">
                <div class="flex items-center space-x-6">
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <span class="font-bold text-lg">GIBSYSNET</span>
                    </div>

                    <div class="hidden md:flex items-center space-x-1">
                        <div class="relative menu-container">
                            <button class="menu-btn px-3 py-2 hover:bg-white/10 rounded flex items-center space-x-1">
                                <i class="fas fa-file"></i><span>File</span><i class="fas fa-chevron-down text-xs ml-1"></i>
                            </button>
                            <div class="menu-dropdown">
                                <a href="#" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-sign-in-alt mr-2"></i>Sign In</a>
                                <a href="#" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-sign-out-alt mr-2"></i>Sign Out</a>
                                <div class="border-t my-1"></div>
                                <a href="#" class="block px-4 py-2 hover:bg-red-50 text-red-600"><i class="fas fa-power-off mr-2"></i>Exit</a>
                            </div>
                        </div>

                        <div class="relative menu-container">
                            <button class="menu-btn px-3 py-2 hover:bg-white/10 rounded flex items-center space-x-1">
                                <i class="fas fa-database"></i><span>Master</span><i class="fas fa-chevron-down text-xs ml-1"></i>
                            </button>
                            <div class="menu-dropdown w-64">
                                <a href="master-data.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-building mr-2"></i>Company Profile</a>
                                <a href="partners.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-handshake mr-2"></i>Partners</a>
                                <a href="cob.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-list-alt mr-2"></i>COB</a>
                                <a href="class.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-hard-hat mr-2"></i>Class Construction</a>
                                <a href="currency.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-money-bill-wave mr-2"></i>Currency</a>
                                <a href="coverages.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-umbrella mr-2"></i>Coverage</a>
                                <a href="objectgroup.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-object-group mr-2"></i>Object Group</a>
                                <a href="occupations.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-user-tie mr-2"></i>Occupations</a>
                                <a href="commission.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-hand-holding-usd mr-2"></i>Commission Management</a>
                                <a href="target.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-bullseye mr-2"></i>Production Target</a>
                            </div>
                        </div>

                        <div class="relative menu-container">
                            <button class="menu-btn px-3 py-2 hover:bg-white/10 rounded flex items-center space-x-1">
                                <i class="fas fa-cogs"></i><span>Administrations</span><i class="fas fa-chevron-down text-xs ml-1"></i>
                            </button>
                            <div class="menu-dropdown">
                                <a href="administration.html?action=password" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-key mr-2"></i>Change Password</a>
                                <a href="users.html" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-users-cog mr-2"></i>User Management</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <button id="notificationBtn" class="relative p-1 hover:bg-white/10 rounded-full">
                            <i class="fas fa-bell text-lg"></i>
                        </button>
                        <div id="notificationDropdown" class="menu-dropdown right-0 mt-2 w-80 max-h-96 overflow-y-auto hidden"></div>
                    </div>

                    <div class="relative">
                        <button id="userMenuBtn" class="flex items-center space-x-2 hover:bg-white/10 px-3 py-1 rounded-lg">
                            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span id="userInitial" class="font-bold">A</span>
                            </div>
                            <span id="userDisplayName" class="font-medium hidden md:inline">Admin</span>
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <div id="userMenu" class="menu-dropdown right-0 w-48 hidden">
                            <div class="px-4 py-3 border-b">
                                <p class="font-semibold text-gray-800" id="menuUserName">Administrator</p>
                                <p class="text-sm text-gray-600" id="menuUserEmail">admin@gibsysnet.com</p>
                            </div>
                            <a href="administration.html?action=profile" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-user-circle mr-2"></i>My Profile</a>
                            <a href="administration.html?action=password" class="block px-4 py-2 hover:bg-blue-50 text-gray-700"><i class="fas fa-key mr-2"></i>Change Password</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const statusBarHtml = `
        <div class="status-bar text-white text-sm">
            <div class="flex justify-between items-center h-full px-4">
                <div class="flex items-center space-x-6 overflow-x-auto">
                    <span><i class="fas fa-id-card mr-1"></i> <span>ID: -</span></span>
                    <span><i class="fas fa-user mr-1"></i> <span>User Name: Administrator</span></span>
                    <span><i class="fas fa-user-shield mr-1"></i> <span>Level: ADMIN</span></span>
                    <span><i class="fas fa-building mr-1"></i> Department: <span>Administration</span></span>
                </div>
                <div class="flex items-center space-x-6">
                    <span><i class="fas fa-calendar mr-1"></i> <span id="proLayoutDate">-</span></span>
                    <span><i class="fas fa-clock mr-1"></i> <span id="proLayoutTime">-</span></span>
                    <span><i class="fas fa-wifi text-green-500"></i> Online</span>
                </div>
            </div>
        </div>
    `;

    const sidebarHtml = `
        <div class="sidebar">
            <div class="p-4 border-b">
                <h2 class="font-bold text-lg text-gray-800 flex items-center"><i class="fas fa-layer-group mr-2 text-blue-600"></i> Module Tools</h2>
            </div>
            <div class="p-4 space-y-6">
                <div>
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">Quick Actions</h3>
                    <div class="space-y-2">
                        <div class="module-chip"><i class="fas fa-plus"></i><span>Add New Record</span></div>
                        <div class="module-chip"><i class="fas fa-save"></i><span>Save Changes</span></div>
                        <div class="module-chip"><i class="fas fa-trash"></i><span>Delete Record</span></div>
                    </div>
                </div>
                <div>
                    <h3 class="font-medium text-gray-700 text-sm uppercase mb-3">Governance Modules</h3>
                    <div class="space-y-2 text-sm text-gray-700">
                        <div class="module-chip"><i class="fas fa-microscope"></i><span>Tool Impact Analysis</span></div>
                        <div class="module-chip"><i class="fas fa-code-branch"></i><span>Data Versioning</span></div>
                        <div class="module-chip"><i class="fas fa-trash-restore"></i><span>Soft Delete</span></div>
                        <div class="module-chip"><i class="fas fa-project-diagram"></i><span>Smart Dependency Control</span></div>
                        <div class="module-chip"><i class="fas fa-robot"></i><span>AI Suggestion (Future Ready)</span></div>
                        <div class="module-chip"><i class="fas fa-heartbeat"></i><span>Data Health Dashboard</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    function updateDateTime() {
        const dateElement = document.getElementById('proLayoutDate');
        const timeElement = document.getElementById('proLayoutTime');
        const now = new Date();

        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const container = document.querySelector('.container');
        const header = container?.querySelector('.header');
        const oldMain = container?.querySelector('main.main-content');

        if (!container || !header || !oldMain || document.querySelector('.dashboard-grid')) {
            return;
        }

        const pageTitleText = header.querySelector('h1')?.textContent?.trim() || 'Master Module';
        const pageSubtitleText = header.querySelector('.subtitle')?.textContent?.trim() || 'Manage data efficiently and professionally';
        const mainInner = oldMain.innerHTML;

        const existingModals = Array.from(document.querySelectorAll('.modal')).map((node) => node.outerHTML).join('\n');

        document.body.classList.add('bg-gray-50');
        document.body.innerHTML = `
            <div class="dashboard-grid">
                ${menuBarHtml}
                ${statusBarHtml}
                ${sidebarHtml}
                <div class="main-content">
                    <div class="mb-6">
                        <div class="flex justify-between items-center">
                            <div>
                                <h1 class="text-2xl font-bold text-gray-800">${pageTitleText}</h1>
                                <p class="text-gray-600">${pageSubtitleText}</p>
                            </div>
                        </div>
                    </div>
                    <div class="health-grid mb-6">
                        <div class="health-card"><p class="health-label">Impact Score</p><p class="health-value">86</p></div>
                        <div class="health-card"><p class="health-label">Data Versions</p><p class="health-value">12</p></div>
                        <div class="health-card"><p class="health-label">Soft Deleted</p><p class="health-value">1</p></div>
                        <div class="health-card"><p class="health-label">Dependency Health</p><p class="health-value">98%</p></div>
                        <div class="health-card"><p class="health-label">Data Quality</p><p class="health-value">95%</p></div>
                    </div>
                    <div class="legacy-grid">
                        ${mainInner}
                    </div>
                </div>
            </div>
            ${existingModals}
        `;

        const menuButtons = document.querySelectorAll('.menu-btn');
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenu = document.getElementById('userMenu');
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');

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

        menuButtons.forEach((button) => {
            const containerNode = button.closest('.menu-container');
            const dropdown = containerNode?.querySelector('.menu-dropdown');
            if (!dropdown) return;

            button.addEventListener('click', function (event) {
                event.stopPropagation();
                document.querySelectorAll('.menu-dropdown').forEach((item) => {
                    if (item !== dropdown) item.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
        });

        document.addEventListener('click', function () {
            document.querySelectorAll('.menu-dropdown').forEach((dropdown) => dropdown.classList.remove('show'));
        });

        updateDateTime();
        setInterval(updateDateTime, 1000);
    });
})();
