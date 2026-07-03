/**
 * tailwind.config.js
 * Shared Tailwind CSS configuration for all GIBSYSNET pages.
 * Include this file BEFORE output.css in every HTML page.
 *
 * Usage:
 *   <script src="assets/js/tailwind.config.js"></script>
 *   <link href="assets/css/output.css" rel="stylesheet">
 */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    50:  '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a'
                }
            }
        }
    }
};
