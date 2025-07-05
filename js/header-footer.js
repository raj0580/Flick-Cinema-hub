document.addEventListener('DOMContentLoaded', () => {
    const loadComponent = (id, url) => {
        fetch(url)
            .then(response => response.text())
            .then(data => {
                const element = document.getElementById(id);
                if (element) {
                    element.innerHTML = data;
                    // Special handling for admin header
                    if (id === 'header-placeholder' && window.location.pathname.includes('admin.html')) {
                        customizeAdminHeader();
                    }
                }
            })
            .catch(error => console.error(`Error loading ${url}:`, error));
    };

    loadComponent('header-placeholder', 'components/header.html');
    loadComponent('footer-placeholder', 'components/footer.html');

    const customizeAdminHeader = () => {
        const navLinks = document.querySelector('#nav-links');
        const logoLink = document.querySelector('header nav a');
        const logoText = logoLink.querySelector('span');

        if(logoText) {
            logoText.textContent = 'Admin Panel';
            logoLink.href = 'admin.html';
        }

        if (navLinks) {
            navLinks.innerHTML = '<a href="index.html" class="text-gray-300 hover:text-cyan-400 transition">View Site</a><button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition">Logout</button>';
        }
    }
});