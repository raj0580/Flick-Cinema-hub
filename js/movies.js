import { getMovies, getMovieById } from './db.js';

// --- TELEGRAM POPUP LOGIC WRAPPER ---
// We wrap all popup code in a function that will be called only when the DOM is ready.
const initializePopup = () => {
    let countdownInterval;
    const popup = document.getElementById('telegram-popup');
    // If the popup doesn't exist on the page (e.g., on index.html), do nothing.
    if (!popup) {
        return; 
    }

    const popupContent = popup.querySelector('div');
    const closeBtn = document.getElementById('close-popup-btn');
    const countdownSpan = document.getElementById('popup-countdown');

    const showPopup = () => {
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);

        let seconds = 5;
        countdownSpan.textContent = seconds;
        clearInterval(countdownInterval); 

        countdownInterval = setInterval(() => {
            seconds--;
            countdownSpan.textContent = seconds;
            if (seconds <= 0) {
                hidePopup();
            }
        }, 1000);
    };

    const hidePopup = () => {
        clearInterval(countdownInterval);
        popup.classList.remove('show');
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 300);
    };

    closeBtn.addEventListener('click', hidePopup);
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            hidePopup();
        }
    });

    // We now attach the click listener to the downloads container and use event delegation.
    // This is more robust and captures all download links, even those inside <details>.
    const downloadsContainer = document.getElementById('downloads-container');
    if(downloadsContainer) {
        downloadsContainer.addEventListener('click', (e) => {
            // Find the closest ancestor that is a download link
            const downloadLink = e.target.closest('.download-link');
            if (downloadLink) {
                e.preventDefault();
                showPopup();
                window.open(downloadLink.href, '_blank');
            }
        });
    }
};

// --- PAGE RENDERING LOGIC ---
const renderMovieCard = (movie) => `
    <a href="movie.html?id=${movie.id}" class="group block bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-shadow duration-300">
        <div class="relative">
            <img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-auto aspect-[2/3] object-cover transform group-hover:scale-105 transition-transform duration-300">
            <div class="absolute top-2 right-2 bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded">${movie.quality || 'HD'}</div>
            ${movie.type === 'Web Series' ? '<div class="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">SERIES</div>' : ''}
        </div>
        <div class="p-3">
            <h3 class="text-md font-bold truncate group-hover:text-cyan-400">${movie.title}</h3>
            <div class="text-xs text-gray-400 mt-1">
                <span>${movie.year}</span> •
                <span class="truncate">${(movie.genres || []).join(', ')}</span>
            </div>
        </div>
    </a>
`;

const renderHomepage = async () => {
    const movieGrid = document.getElementById('movie-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResults = document.getElementById('no-results');
    try {
        const movies = (await getMovies()).sort((a, b) => b.year - a.year);
        loadingSpinner.style.display = 'none';
        if (movies.length === 0) { noResults.style.display = 'block'; return; }
        const populateFilters = (movies) => {
            const genres = [...new Set(movies.flatMap(m => m.genres || []))].sort();
            const years = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);
            const languages = [...new Set(movies.map(m => m.language))].sort();
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const langFilter = document.getElementById('lang-filter');
            genres.forEach(g => genreFilter.innerHTML += `<option value="${g}">${g}</option>`);
            years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);
            languages.forEach(l => langFilter.innerHTML += `<option value="${l}">${l}</option>`);
        };
        const displayMovies = (moviesToDisplay) => {
            movieGrid.innerHTML = moviesToDisplay.map(renderMovieCard).join('');
            noResults.style.display = moviesToDisplay.length === 0 ? 'block' : 'none';
        };
        const filterMovies = () => {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const selectedGenre = document.getElementById('genre-filter').value;
            const selectedYear = document.getElementById('year-filter').value;
            const selectedLang = document.getElementById('lang-filter').value;
            const filtered = movies.filter(movie => ((movie.genres || []).includes(selectedGenre) || !selectedGenre) && movie.title.toLowerCase().includes(searchTerm) && (!selectedYear || movie.year == selectedYear) && (!selectedLang || movie.language === selectedLang));
            displayMovies(filtered);
        };
        populateFilters(movies);
        displayMovies(movies);
        ['search-input', 'genre-filter', 'year-filter', 'lang-filter'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', filterMovies);
        });
    } catch (error) {
        if(loadingSpinner) loadingSpinner.innerHTML = `<p class="text-red-500">Failed to load movies.</p>`;
    }
};

const renderMovieDetailPage = async () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('id');
    if (!movieId) return window.location.href = 'index.html';

    const loadingSpinner = document.getElementById('loading-spinner');
    const movieContent = document.getElementById('movie-content');
    const errorMessage = document.getElementById('error-message');

    try {
        const movie = await getMovieById(movieId);
        loadingSpinner.style.display = 'none';
        if (!movie) return errorMessage.style.display = 'block';

        document.title = `${movie.title} - Flick Cinema`;
        ['poster', 'title', 'type', 'description', 'year', 'language'].forEach(id => {
            const el = document.getElementById(`movie-${id}`);
            if (el) {
                if (id === 'poster') { el.src = movie.posterUrl; el.alt = movie.title; }
                else el.textContent = movie[id] || (id === 'type' ? 'Movie' : '');
            }
        });
        
        document.getElementById('movie-genres').innerHTML = (movie.genres || []).map(g => `<span class="bg-gray-700 text-cyan-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">${g}</span>`).join('');
        document.getElementById('movie-tags').innerHTML = (movie.tags || []).map(t => `<span class="bg-gray-600 text-gray-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${t}</span>`).join('');

        const trailerContainer = document.getElementById('trailer-container');
        if (movie.trailerUrl) {
            const videoId = movie.trailerUrl.split('v=')[1]?.split('&')[0] || movie.trailerUrl.split('/').pop();
            trailerContainer.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        }

        document.getElementById('screenshots-grid').innerHTML = (movie.screenshots || []).map(url => `<a href="${url}" target="_blank"><img src="${url}" class="w-full h-auto rounded-lg object-cover" alt="Screenshot"></a>`).join('');

        const downloadsContainer = document.getElementById('downloads-container');
        let downloadsHtml = '';

        const renderQualityGroups = (groups) => {
            if (!groups || groups.length === 0) return '';
            return groups.map(group => `
                <div class="mb-4">
                    <h4 class="text-md font-semibold text-gray-300 mb-3 border-b-2 border-gray-700 pb-1">${group.quality}</h4>
                    <div class="space-y-2 pl-2">
                        ${group.links.map((link, index) => `
                            <a href="${link.url}" class="download-link flex justify-between items-center bg-gray-900 hover:bg-gray-800 p-3 rounded-lg transition">
                                <span class="font-semibold text-cyan-400">Link ${index + 1}</span>
                                <span class="text-sm text-gray-400">${link.size}</span>
                                <span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        };
        
        if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">${movie.type === 'Web Series' ? 'Full Season Pack' : 'Download Links'}</h3>`;
            downloadsHtml += `<div class="bg-gray-800 p-4 rounded-lg">${renderQualityGroups(movie.downloadLinks)}</div>`;
        }

        if (movie.type === 'Web Series' && movie.episodes && movie.episodes.length > 0) {
            if (downloadsHtml !== '') downloadsHtml += `<hr class="border-gray-700 my-8">`;
            downloadsHtml += `<h3 class="text-xl font-bold mb-4 text-gray-300">Individual Episodes</h3>`;
            downloadsHtml += movie.episodes.map(episode => `
                <details class="bg-gray-800 rounded-lg overflow-hidden mb-3">
                    <summary class="font-bold text-lg p-4 bg-gray-700/50 hover:bg-gray-700">${episode.episodeTitle}</summary>
                    <div class="p-4 space-y-4">
                        ${renderQualityGroups(episode.qualityGroups) || '<p class="text-gray-400">No links for this episode.</p>'}
                    </div>
                </details>
            `).join('');
        }
        
        downloadsContainer.innerHTML = downloadsHtml || '<p class="text-gray-400">No download links available.</p>';
        movieContent.style.display = 'block';

    } catch (error) {
        console.error("Error loading movie details:", error);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'block';
    }
};


// --- INITIALIZATION ---
// This runs after the initial HTML document has been completely loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('movie-grid')) {
        renderHomepage();
    } else if (document.getElementById('movie-content')) {
        renderMovieDetailPage();
        // Initialize the popup logic ONLY on the movie detail page.
        initializePopup();
    }
});
