import { getMovieById, addReport } from './db.js';

const initializePopup = () => {
    let countdownInterval;
    const popup = document.getElementById('telegram-popup');
    if (!popup) return;
    const closeBtn = document.getElementById('close-popup-btn');
    const countdownSpan = document.getElementById('popup-countdown');
    const showPopup = () => {
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
        clearInterval(countdownInterval);
        popup.classList.remove('show');
        setTimeout(() => popup.classList.add('hidden'), 300);
    };
    closeBtn.addEventListener('click', hidePopup);
    popup.addEventListener('click', (e) => { if (e.target === popup) hidePopup(); });
};

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
        const movie = await getMovieById(movieId);
        loadingSpinner.style.display = 'none';
        if (!movie) return errorMessage.style.display = 'block';

        document.title = `Download ${movie.title} - Flick Cinema`;
        document.getElementById('movie-title').textContent = `Download ${movie.title} (${movie.year})`;
        
        const downloadsContainer = document.getElementById('downloads-container');
        let downloadsHtml = '';
        
        const renderOldLinks = (links) => links.map(link => `<div class="flex items-center gap-2"><a href="${link.url}" class="download-link flex-1 flex justify-between items-center bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition"><span class="font-semibold text-cyan-400">${link.quality}</span><span class="text-sm text-gray-400">${link.size}</span><span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span></a><button class="report-link-btn p-2 bg-red-800/50 hover:bg-red-700 rounded-lg" data-movie-title="${movie.title}" data-quality="${link.quality}" data-url="${link.url}">Report</button></div>`).join('');
        const renderNewLinks = (groups) => (groups || []).map(group => `<div class="mb-4"><h4 class="text-md font-semibold text-gray-300 mb-3 border-b-2 border-gray-700 pb-1">${group.quality}</h4><div class="space-y-2 pl-2">${(group.links || []).map((link, index) => `<div class="flex items-center gap-2"><a href="${link.url}" class="download-link flex-1 flex justify-between items-center bg-gray-900 hover:bg-gray-800 p-3 rounded-lg transition"><span class="font-semibold text-cyan-400">Link ${index + 1}</span><span class="text-sm text-gray-400">${link.size}</span><span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span></a><button class="report-link-btn p-2 bg-red-800/50 hover:bg-red-700 rounded-lg" data-movie-title="${movie.title}" data-quality="${group.quality} - Link ${index + 1}" data-url="${link.url}">Report</button></div>`).join('')}</div></div>`).join('');
        
        const isNewFormat = movie.downloadLinks && movie.downloadLinks.length > 0 && typeof movie.downloadLinks[0].links !== 'undefined';
        if (isNewFormat) {
            downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">${movie.type === 'Web Series' ? 'Full Season Pack' : 'Download Links'}</h3><div class="bg-gray-800 p-4 rounded-lg">${renderNewLinks(movie.downloadLinks)}</div>`;
        } else if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            downloadsHtml += `<div class="space-y-3">${renderOldLinks(movie.downloadLinks)}</div>`;
        }
        
        if (movie.type === 'Web Series' && movie.episodes && movie.episodes.length > 0) {
            if (downloadsHtml !== '') downloadsHtml += `<hr class="border-gray-700 my-8">`;
            downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">Individual Episodes</h3>`;
            downloadsHtml += movie.episodes.map(episode => `<details class="bg-gray-800 rounded-lg overflow-hidden mb-3"><summary class="font-bold text-lg p-4 bg-gray-700/50 hover:bg-gray-700">${episode.episodeTitle}</summary><div class="p-4 space-y-4">${renderNewLinks(episode.qualityGroups) || '<p class="text-gray-400">No links for this episode.</p>'}</div></details>`).join('');
        }
        
        downloadsContainer.innerHTML = downloadsHtml || '<p class="text-gray-400">No download links available.</p>';
        pageContent.style.display = 'block';

        downloadsContainer.addEventListener('click', async (e) => {
            const downloadButton = e.target.closest('.download-link');
            const reportButton = e.target.closest('.report-link-btn');

            if (downloadButton) {
                e.preventDefault();
                showPopup();
                window.open(downloadButton.href, '_blank');
            }

            if (reportButton) {
                e.preventDefault();
                const { movieTitle, quality, url } = reportButton.dataset;
                reportButton.textContent = 'Reporting...';
                reportButton.disabled = true;
                try {
                    await addReport({ movieTitle, quality, brokenUrl: url, reportedAt: new Date() });
                    showToast('Link reported. Thank you!');
                } catch (err) {
                    showToast('Failed to report link.', true);
                    reportButton.disabled = false;
                } finally {
                    setTimeout(() => {
                        if (reportButton.disabled) reportButton.textContent = 'Reported';
                        else reportButton.textContent = 'Report';
                    }, 2000);
                }
            }
        });

    } catch (error) {
        console.error("Error loading download page:", error);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'block';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // This script only runs on the download page
    renderDownloadPage();
    initializePopup();
});
