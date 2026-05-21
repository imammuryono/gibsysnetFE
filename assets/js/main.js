// assets/js/main.js

// Global configuration
const CONFIG = {
    API_BASE_URL: '../backend',
    APP_NAME: 'GIBSYSNET',
    VERSION: '2.1.0'
};

// Common utilities
const Utils = {
    // Format currency
    formatCurrency: (amount, currency = 'IDR') => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    },

    // Format date
    formatDate: (dateString, format = 'short') => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: format === 'short' ? 'short' : 'long',
            day: 'numeric'
        });
    },

    // Get current date time for status bar
    getCurrentDateTime: () => {
        const now = new Date();
        const date = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const time = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return { date, time };
    },

    // Generate random ID
    generateId: (prefix = '') => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    // Show notification
    showNotification: (message, type = 'info') => {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full`;
        notification.textContent = message;
        notification.id = 'temp-notification';

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 10);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    },

    // Validate email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone number
    validatePhone: (phone) => {
        const re = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return re.test(phone);
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Authentication helper
const Auth = {
    // Check if user is logged in
    isLoggedIn: () => {
        return localStorage.getItem('gibsysnet_token') !== null;
    },

    // Get user data
    getUser: () => {
        const userData = localStorage.getItem('gibsysnet_user');
        return userData ? JSON.parse(userData) : null;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('gibsysnet_token');
        localStorage.removeItem('gibsysnet_user');
        window.location.href = 'login.html';
    },

    // Check permission
    hasPermission: (permission) => {
        const user = Auth.getUser();
        if (!user) return false;
        
        if (user.level === 'super_admin') return true;
        if (user.level === 'admin' && permission !== 'user_management') return true;
        
        return user.permissions && user.permissions.includes(permission);
    }
};

// API Client
const API = {
    // Generic request method
    request: async (endpoint, method = 'GET', data = null) => {
        const url = `${CONFIG.API_BASE_URL}/${endpoint}`;
        const token = localStorage.getItem('gibsysnet_token');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const options = {
            method,
            headers,
            mode: 'cors',
            cache: 'no-cache'
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    // Login
    login: async (username, password) => {
        const data = { username, password };
        return await API.request('auth/login', 'POST', data);
    },

    // Get dashboard data
    getDashboardData: async () => {
        return await API.request('dashboard/data');
    },

    // Get clients
    getClients: async (page = 1, limit = 20) => {
        return await API.request(`clients?page=${page}&limit=${limit}`);
    }
};

// Initialize common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Update copyright year
    const yearElements = document.querySelectorAll('[data-current-year]');
    if (yearElements.length > 0) {
        const currentYear = new Date().getFullYear();
        yearElements.forEach(el => {
            el.textContent = currentYear;
        });
    }

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[title]');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', function(e) {
            const title = this.getAttribute('title');
            if (title) {
                const tooltipEl = document.createElement('div');
                tooltipEl.className = 'fixed bg-gray-800 text-white text-sm px-2 py-1 rounded shadow-lg z-50';
                tooltipEl.textContent = title;
                tooltipEl.style.left = `${e.pageX + 10}px`;
                tooltipEl.style.top = `${e.pageY + 10}px`;
                tooltipEl.id = 'dynamic-tooltip';
                document.body.appendChild(tooltipEl);
                
                this.setAttribute('data-original-title', title);
                this.removeAttribute('title');
            }
        });
        
        tooltip.addEventListener('mouseleave', function() {
            const tooltipEl = document.getElementById('dynamic-tooltip');
            if (tooltipEl) {
                tooltipEl.remove();
            }
            
            const originalTitle = this.getAttribute('data-original-title');
            if (originalTitle) {
                this.setAttribute('title', originalTitle);
                this.removeAttribute('data-original-title');
            }
        });
    });

    // Auto-hide notifications
    const autoHideNotifications = document.querySelectorAll('.auto-hide');
    autoHideNotifications.forEach(notification => {
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    });
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils, Auth, API, CONFIG };
}