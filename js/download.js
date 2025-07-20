import { getMovieById, addReport, getReports } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    
    let countdownInterval;
    const popup = document.getElementById('telegram-popup');
    const closeBtn = document.getElementById('close-popup-btn');
    const countdownSpan = document.getElementById('popup-countdown');

    const showPopup = () => {
        if (!popup) return;
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('show'), 10);
        let seconds = 15;
        countdownSpan.textContent = seconds;
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            seconds--;
            countdownSpan.textContent = seconds;
            if (seconds <= 0) hidePopup();
        }, 1000);
    };

    const hidePopup = () => {
        if (!popup) return;
        clearInterval(countdownInterval);
        popup.classList.remove('show');
        setTimeout(() => popup.classList.add('hidden'), 300);
    };
    
    if (closeBtn) closeBtn.addEventListener('click', hidePopup);
    if (popup) popup.addEventListener('click', (e) => { if (e.target === popup) hidePopup(); });
    
    const renderDownloadPage = async () => {
        const params = new URLSearchParams(window.location.search);
        const movieId = params.get('id');
        if (!movieId) return window.location.href = 'index.html';

        const loadingSpinner = document.getElementById('loading-spinner');
        const pageContent = document.getElementById('download-page-content');
        const errorMessage = document.getElementById('error-message');
        const toast = document.getElementById('toast');

        const showToast = (message, isError = false) => {
            toast.textContent = message;
            toast.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transition-all duration-300';
            toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500', 'opacity-100', 'translate-y-0');
            setTimeout(() => toast.classList.add('opacity-0', 'translate-y-full'), 3000);
        };

        try {
            const [movie, existingReports] = await Promise.all([
                getMovieById(movieId),
                getReports()
            ]);
            
            const reportedUrls = new Set(existingReports.map(report => report.brokenUrl));
            loadingSpinner.style.display = 'none';
            if (!movie) return errorMessage.style.display = 'block';

            document.title = `Download ${movie.title} - Flick Cinema`;
            document.getElementById('movie-title').textContent = `${movie.title} (${movie.year})`;
            document.getElementById('movie-poster').src = movie.posterUrl;
            
            const detailsContainer = document.getElementById('extra-details-container');
            let detailsHtml = '';
            if (movie.year) detailsHtml += `<div><strong>Year:</strong> <span class="text-gray-200">${movie.year}</span></div>`;
            if (movie.category) detailsHtml += `<div><strong>Category:</strong> <span class="text-gray-200">${movie.category}</span></div>`;
            if (movie.language) detailsHtml += `<div><strong>Language:</strong> <span class="text-gray-200">${movie.language}</span></div>`;
            detailsContainer.innerHTML = detailsHtml;

            // --- THIS IS THE FIX ---
            const screenshotsGrid = document.getElementById('screenshots-grid');
            screenshotsGrid.innerHTML = (movie.screenshots || []).map(url => `<a href="${url}" target="_blank"><img src="${url}" class="w-full h-auto rounded-lg object-cover" alt="Screenshot"></a>`).join('');

            const downloadsContainer = document.getElementById('downloads-container');
            let downloadsHtml = '';
            
            const renderLinkRow = (link, quality, index = null, isOldFormat = false) => {
                const isReported = reportedUrls.has(link.url);
                const linkLabel = isOldFormat ? quality : `Link ${index + 1}`;
                const qualityLabel = isOldFormat ? quality : `${quality} - Link ${index + 1}`;
                const bgClass = isOldFormat ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800';
                
                return `
                    <div class="link-wrapper mt-2">
                        <div class="flex items-center gap-2">
                            <a href="${link.url}" class="download-link flex-1 flex justify-between items-center ${bgClass} p-3 rounded-lg transition">
                                <span class="font-semibold text-cyan-400">${linkLabel}</span>
                                <span class="text-sm text-gray-400">${link.size}</span>
                                <span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span>
                            </a>
                            <div class="report-container text-center">
                                <button class="report-link-btn text-xs px-2 py-1 ${isReported ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-800/50 hover:bg-red-700'} rounded-lg" 
                                    data-movie-title="${movie.title}" 
                                    data-quality="${qualityLabel}" 
                                    data-url="${link.url}" 
                                    ${isReported ? 'disabled' : ''}>
                                    ${isReported ? 'Reported' : 'Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            };

            const renderNewLinks = (groups) => (groups || []).map(group => `
                <div class="mb-4">
                    <h4 class="text-md font-semibold text-gray-300 mb-3 border-b-2 border-gray-700 pb-1">${group.quality}</h4>
                    <div class="space-y-2 pl-2">
                        ${(group.links || []).map((link, index) => renderLinkRow(link, group.quality, index, false)).join('')}
                    </div>
                </div>`).join('');
            
            const renderOldLinks = (links) => links.map(link => renderLinkRow(link, link.quality, null, true)).join('');

            const isNewFormat = movie.downloadLinks && movie.downloadLinks.length > 0 && typeof movie.downloadLinks[0].links !== 'undefined';
            if (isNewFormat) {
                downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">${movie.type === 'Web Series' ? 'Full Season Pack' : 'Download Links'}</h3><div class="bg-gray-800/50 p-4 rounded-lg">${renderNewLinks(movie.downloadLinks)}</div>`;
            } else if (movie.downloadLinks && movie.downloadLinks.length > 0) {
                 downloadsHtml += `<div class="bg-gray-800/50 p-4 rounded-lg space-y-3">${renderOldLinks(movie.downloadLinks)}</div>`;
            }
            
            if (movie.type === 'Web Series' && movie.episodes && movie.episodes.length > 0) {
                if (downloadsHtml !== '') downloadsHtml += `<hr class="border-gray-700 my-8">`;
                downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">Individual Episodes</h3>`;
                downloadsHtml += movie.episodes.map(episode => `<details class="bg-gray-800/50 rounded-lg overflow-hidden mb-3"><summary class="font-bold text-lg p-4 bg-gray-700/50 hover:bg-gray-700">${episode.episodeTitle}</summary><div class="p-4 space-y-4">${renderNewLinks(episode.qualityGroups) || '<p class="text-gray-400">No links for this episode.</p>'}</div></details>`).join('');
            }
            
            downloadsContainer.innerHTML = downloadsHtml || '<p class="text-gray-400">No download links available.</p>';
            pageContent.style.display = 'block';

            downloadsContainer.addEventListener('click', async (e) => {
                const downloadButton = e.target.closest('.download-link');
                if (downloadButton) {
                    e.preventDefault();
                    showPopup();
                    window.open(downloadButton.href, '_blank');
                    const wrapper = downloadButton.closest('.link-wrapper');
                    if(wrapper) {
                       const reportContainer = wrapper.querySelector('.report-container');
                       if(reportContainer) reportContainer.classList.add('show');
                    }
                }
                
                const reportButton = e.target.closest('.report-link-btn');
                if (reportButton) {
                    const { movieTitle, quality, url } = reportButton.dataset;
                    reportButton.textContent = 'Reporting...';
                    reportButton.disabled = true;
                    try {
                        await addReport({ movieTitle, quality, brokenUrl: url, reportedAt: new Date() });
                        showToast('Link reported. Thank you!');
                        reportButton.textContent = 'Reported';
                        reportButton.classList.remove('bg-red-800/50', 'hover:bg-red-700');
                        reportButton.classList.add('bg-gray-600', 'cursor-not-allowed');
                    } catch (err) {
                        showToast('Failed to report link.', true);
                        reportButton.disabled = false;
                        reportButton.textContent = 'Report';
                    }
                }
            });

        } catch (error) {
            console.error("Error loading download page:", error);
            if(loadingSpinner) loadingSpinner.style.display = 'none';
            if(errorMessage) errorMessage.style.display = 'block';
        }
    };

    renderDownloadPage();
});
