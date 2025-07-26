document.addEventListener('DOMContentLoaded', () => {
    const loadAndCustomizeHeader = async () => {
        try {
            // Load header HTML
            const response = await fetch('/components/header.html');
            if (!response.ok) throw new Error('Failed to load header');
            const headerHtml = await response.text();
            
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = headerHtml;
            }

            // Now that the header is definitely in the DOM, we can safely customize it
            const navLinksContainer = document.getElementById('nav-links');
            const logoLink = document.querySelector('header nav a');
            const logoText = logoLink ? logoLink.querySelector('span') : null;
            const pathname = window.location.pathname;

            if (!navLinksContainer || !logoLink || !logoText) return;

            let linksHtml = '';
            linksHtml += `<a href="/index.html" class="text-gray-300 hover:text-cyan-400 transition hidden sm:block">Home</a>`;

            if (pathname.includes('/movie.html') || pathname.includes('/download.html') || pathname.includes('/movie/') || pathname.includes('/download/')) {
                linksHtml += `
                    <button id="search-icon-btn" class="text-gray-300 hover:text-cyan-400 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                `;
            }

            linksHtml += `
                <a href="https://t.me/flickcinemaa" target="_blank" class="flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white font-bold p-2 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-1.37.2-1.64l16.12-5.72c.78-.27 1.45.16 1.18 1.34l-2.83 13.25c-.28 1.3-1.02 1.6-2.03 1.01L12.6 16.3l-1.99 1.9c-.2.2-.4.4-.64.4z"></path>
                    </svg>
                </a>
            `;
            
            if (pathname.includes('/admin.html')) {
                logoText.textContent = 'Admin Panel';
                logoLink.href = '/admin.html';
                navLinksContainer.innerHTML = `
                    <a href="/index.html" class="text-gray-300 hover:text-cyan-400 transition">View Site</a>
                    <button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition">Logout</button>
                `;
            } else {
                logoLink.href = "/index.html";
                navLinksContainer.innerHTML = linksHtml;
            }
        } catch (error) {
            console.error("Failed to load or customize header:", error);
        }
    };
    
    const loadFooter = () => {
        fetch('/components/footer.html')
            .then(response => response.ok ? response.text() : Promise.reject('Failed to load footer'))
            .then(data => {
                const footerPlaceholder = document.getElementById('footer-placeholder');
                if (footerPlaceholder) footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error(error));
    };

    // Run both functions
    loadAndCustomizeHeader();
    loadFooter();
});
