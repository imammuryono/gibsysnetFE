// User data from localStorage
let userData = null;

// Check if user is logged in
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('gibsysnet_user'));
    const token = localStorage.getItem('gibsysnet_token');

    if (!user || !token) {
        // **PERBAIKAN: Redirect ke ../login.html karena beda folder**
        window.location.href = '../login.html';
        return false;
    }
    
    // Check if user has admin access
    if (user.user_level !== 'admin' && user.user_level !== 'super_admin') {
        // Redirect non-admin users to user dashboard
        window.location.href = 'dashboard-user.html';
        return false;
    }
    
    return user;
}

// Initialize user data
userData = checkLogin();

// Update user information in dashboard
function updateUserInfo() {
    if (!userData) return;
    
    // Get initials from full name
    const initials = userData.full_name ? 
        userData.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';
    
    // Update all instances of user info in menu bar
    document.getElementById('userInitial').textContent = initials.charAt(0);
    document.getElementById('userDisplayName').textContent = userData.full_name || 'Admin';
    document.getElementById('menuUserName').textContent = userData.full_name || 'Administrator';
    document.getElementById('menuUserEmail').textContent = userData.email || 'admin@gibsysnet.com';
    
    // **PERBAIKAN UTAMA: Update status bar with real user data**
    document.getElementById('userId').textContent = `ID: ${userData.user_id || 'N/A'}`;
    document.getElementById('userFullName').textContent = `User Name: ${userData.full_name || 'Admin'}`;
    document.getElementById('userLevel').textContent = `Level: ${(userData.user_level || 'admin').toUpperCase()}`;
    document.getElementById('userDept').textContent = userData.department || 'Administration';
    
    // Update greeting
    updateGreeting();
}

// Update greeting based on time
function updateGreeting() {
    if (!userData) return;
    
    const hour = new Date().getHours();
    let greeting = 'Selamat';
    
    if (hour < 12) greeting = 'Selamat pagi';
    else if (hour < 15) greeting = 'Selamat siang';
    else if (hour < 18) greeting = 'Selamat sore';
    else greeting = 'Selamat malam';
    
    const firstName = userData.full_name ? userData.full_name.split(' ')[0] : 'Admin';
    document.getElementById('greetingName').textContent = `${greeting}, ${firstName}!`;
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

// Sidebar menu functionality
function initializeSidebarMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
        });
    });
}

// Set active navigation item
function setActiveNav(element) {
    // Remove active class from all nav items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    element.classList.add('active');
}

// **PERBAIKAN UTAMA: Fixed logout function dengan path yang benar**
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Show loading indicator
        document.getElementById('loadingIndicator').classList.remove('hidden');
        
        // Clear localStorage
        localStorage.removeItem('gibsysnet_user');
        localStorage.removeItem('gibsysnet_token');
        localStorage.removeItem('gibsysnet_session');
        
        // Add small delay to ensure localStorage is cleared
        setTimeout(function() {
            // **PERBAIKAN: Redirect ke ../login.html karena beda folder**
            window.location.href = '../login.html';
        }, 500);
    }
}

// Alternative logout function with better error handling
async function safeLogout() {
    try {
        // Try to use Auth.logout if available
        if (window.Auth && typeof window.Auth.logout === 'function') {
            await window.Auth.logout(true);
        } else {
            // Fallback to manual logout
            handleLogout();
        }
    } catch (error) {
        console.error('Error during logout:', error);
        // Fallback to manual logout
        handleLogout();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        if (window.loadDashboardData) {
            await window.loadDashboardData();
        }
        
        // You can load additional dashboard data here
        // For example: recent activities, quotations, etc.
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    } finally {
        // Hide loading indicator
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // **PERBAIKAN: Check login first**
    if (!userData) {
        window.location.href = '../login.html';
        return;
    }
    
    // Update user info
    updateUserInfo();
    
    // Update date time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize UI components
    initializeDropdowns();
    initializeSidebarMenu();
    
    // Load dashboard data
    loadDashboardData();
    
    // Auto-refresh every 5 minutes
    setInterval(loadDashboardData, 5 * 60 * 1000);
    
    // **PERBAIKAN: Add event listeners for logout buttons**
    document.querySelectorAll('[onclick*="handleLogout"]').forEach(button => {
        button.onclick = handleLogout;
    });
});

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    // Update any responsive elements if needed
});

// **PERBAIKAN: Session timeout check**
let lastActivity = Date.now();

document.addEventListener('mousemove', function() {
    lastActivity = Date.now();
});

document.addEventListener('keypress', function() {
    lastActivity = Date.now();
});

setInterval(function() {
    const now = Date.now();
    const inactiveTime = (now - lastActivity) / 1000 / 60;
    
    // Auto-logout after 30 minutes of inactivity
    if (inactiveTime > 30) {
        if (confirm('Your session has expired due to inactivity. Please login again.')) {
            handleLogout();
        }
    }
}, 60000);
