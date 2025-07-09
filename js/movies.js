import { getMovies, getMovieById, addMovieRequest } from './db.js';

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
    const downloadsContainer = document.getElementById('downloads-container');
    if (downloadsContainer) {
        downloadsContainer.addEventListener('click', (e) => {
            const downloadLink = e.target.closest('.download-link');
            if (downloadLink) {
                e.preventDefault();
                showPopup();
                window.open(downloadLink.href, '_blank');
            }
        });
    }
};

const renderMovieCard = (movie) => {
    // --- THIS IS THE NEW, PERMANENT FIX ---
    // The tags are now created inside a container that forces them to wrap correctly.
    // The "SERIES" tag will naturally flow below the quality tag if there isn't enough space.
    let tagsHtml = `
        <div class="absolute top-2 right-2 flex flex-wrap justify-end gap-2">
            ${movie.type === 'Web Series' ? `<span class="bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-md">SERIES</span>` : ''}
            ${movie.quality ? `<span class="bg-cyan-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-md">${movie.quality}</span>` : ''}
        </div>
    `;

    return `
        <a href="movie.html?id=${movie.id}" class="group block bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-shadow duration-300">
            <div class="relative">
                <img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-auto aspect-[2/3] object-cover transform group-hover:scale-105 transition-transform duration-300">
                ${tagsHtml}
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
};


const renderHomepage = async (initialSearchTerm = '') => {
    const movieGrid = document.getElementById('movie-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResultsSection = document.getElementById('no-results-section');
    const searchInput = document.getElementById('search-input');
    try {
        const movies = (await getMovies()).sort((a, b) => b.year - a.year);
        loadingSpinner.style.display = 'none';
        
        const populateFilters = (movies) => {
            const genres = [...new Set(movies.flatMap(m => m.genres || []))].sort();
            const years = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);
            const categories = [...new Set(movies.map(m => m.category).filter(Boolean))].sort();
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const categoryFilter = document.getElementById('category-filter');
            genres.forEach(g => genreFilter.innerHTML += `<option value="${g}">${g}</option>`);
            years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);
            categories.forEach(c => categoryFilter.innerHTML += `<option value="${c}">${c}</option>`);
        };

        const displayMovies = (moviesToDisplay) => {
            movieGrid.innerHTML = moviesToDisplay.map(renderMovieCard).join('');
            if (moviesToDisplay.length === 0) {
                noResultsSection.style.display = 'block';
                document.getElementById('request-title').value = searchInput.value;
            } else {
                noResultsSection.style.display = 'none';
            }
        };

        const filterMovies = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedGenre = document.getElementById('genre-filter').value;
            const selectedYear = document.getElementById('year-filter').value;
            const selectedCategory = document.getElementById('category-filter').value;
            const filtered = movies.filter(movie => ((movie.genres || []).includes(selectedGenre) || !selectedGenre) && movie.title.toLowerCase().includes(searchTerm) && (!selectedYear || movie.year == selectedYear) && (!selectedCategory || movie.category === selectedCategory));
            displayMovies(filtered);
        };
        
        if (movies.length === 0) {
            displayMovies([]);
        } else {
            populateFilters(movies);
            if (initialSearchTerm) {
                searchInput.value = initialSearchTerm;
            }
            filterMovies();
        }
        
        ['search-input', 'genre-filter', 'year-filter', 'category-filter'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', filterMovies);
        });

    } catch (error) {
        if(loadingSpinner) loadingSpinner.innerHTML = `<p class="text-red-500">Failed to load movies.</p>`;
    }
};

const handleRequestForm = () => {
    const form = document.getElementById('request-form');
    if (!form) return;
    const userDetailsSection = document.getElementById('user-details-section');
    const nameInput = document.getElementById('request-name');
    const savedUserName = localStorage.getItem('flickCinemaUserName');
    if (!savedUserName) {
        userDetailsSection.classList.remove('hidden');
        nameInput.required = true;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('request-submit-btn');
        const messageDiv = document.getElementById('request-message');
        const title = document.getElementById('request-title').value.trim();
        const notes = document.getElementById('request-notes').value.trim();
        let userName = savedUserName || nameInput.value.trim();
        if (!title || !userName) {
            messageDiv.textContent = "Please fill out all required fields.";
            messageDiv.className = "mt-4 text-red-400";
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        try {
            await addMovieRequest({ title, notes, userName, requestedAt: new Date() });
            if (!savedUserName) {
                localStorage.setItem('flickCinemaUserName', userName);
                userDetailsSection.classList.add('hidden');
            }
            messageDiv.textContent = "Thank you! Your request has been sent.";
            messageDiv.className = "mt-4 text-green-400";
            document.getElementById('request-title').value = '';
            document.getElementById('request-notes').value = '';
        } catch (err) {
            messageDiv.textContent = "Something went wrong. Please try again.";
            messageDiv.className = "mt-4 text-red-400";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";
        }
    });
};

const renderRecommendations = async (currentMovie) => {
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendationsGrid = document.getElementById('recommendations-grid');
    if (!recommendationsSection || !recommendationsGrid) return;
    const allMovies = await getMovies();
    const recommended = [];
    if (currentMovie.category) {
        const byCategory = allMovies.filter(m => m.id !== currentMovie.id && m.category === currentMovie.category);
        recommended.push(...byCategory);
    }
    if (currentMovie.genres && currentMovie.genres.length > 0) {
        const byGenre = allMovies.filter(m => {
            if (m.id === currentMovie.id || recommended.some(rec => rec.id === m.id)) return false;
            return (m.genres || []).some(genre => currentMovie.genres.includes(genre));
        });
        recommended.push(...byGenre);
    }
    const uniqueRecommended = [...new Map(recommended.map(item => [item.id, item])).values()];
    const shuffled = uniqueRecommended.sort(() => 0.5 - Math.random());
    const finalRecommendations = shuffled.slice(0, 5);
    if (finalRecommendations.length > 0) {
        recommendationsGrid.innerHTML = finalRecommendations.map(renderMovieCard).join('');
        recommendationsSection.classList.remove('hidden');
    }
};

const initializeMoviePageSearch = () => {
    const observer = new MutationObserver((mutations, obs) => {
        const searchIconBtn = document.getElementById('search-icon-btn');
        if (searchIconBtn) {
            const searchBarContainer = document.getElementById('search-bar-container');
            let isSearchVisible = false;
            const showSearchBar = () => {
                searchBarContainer.innerHTML = `<div id="movie-page-search-bar" class="fixed top-[-100px] left-0 right-0 bg-gray-900/90 backdrop-blur-sm p-4 z-30 shadow-lg"><div class="container mx-auto"><form id="movie-page-search-form" class="flex gap-2"><input type="search" id="movie-page-search-input" class="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500" placeholder="Search for another movie..."><button type="submit" class="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">Search</button></form></div></div>`;
                setTimeout(() => {
                    const searchBar = document.getElementById('movie-page-search-bar');
                    if (searchBar) searchBar.style.top = '68px';
                }, 10);
                document.getElementById('movie-page-search-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const searchTerm = document.getElementById('movie-page-search-input').value;
                    if (searchTerm) window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
                });
                isSearchVisible = true;
            };
            const hideSearchBar = () => {
                const searchBar = document.getElementById('movie-page-search-bar');
                if (searchBar) {
                    searchBar.style.top = '-100px';
                    setTimeout(() => { searchBarContainer.innerHTML = ''; }, 300);
                }
                isSearchVisible = false;
            };
            searchIconBtn.addEventListener('click', () => {
                if (isSearchVisible) hideSearchBar();
                else showSearchBar();
            });
            obs.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
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
        document.getElementById('movie-poster').src = movie.posterUrl;
        document.getElementById('movie-title').textContent = movie.title || '';
        document.getElementById('movie-type').textContent = movie.type || 'Movie';
        document.getElementById('movie-description').textContent = movie.description || '';
        const detailsContainer = document.getElementById('extra-details-container');
        let detailsHtml = '';
        if (movie.year) detailsHtml += `<div><strong>Year:</strong> <span class="text-gray-200">${movie.year}</span></div>`;
        if (movie.category) detailsHtml += `<div><strong>Category:</strong> <span class="text-gray-200">${movie.category}</span></div>`;
        if (movie.language) detailsHtml += `<div><strong>Language:</strong> <span class="text-gray-200">${movie.language}</span></div>`;
        detailsContainer.innerHTML = detailsHtml;
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
        const renderOldLinks = (links) => links.map(link => `<a href="${link.url}" class="download-link flex justify-between items-center bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition"><span class="font-semibold text-cyan-400">${link.quality}</span><span class="text-sm text-gray-400">${link.size}</span><span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span></a>`).join('');
        const renderNewLinks = (groups) => (groups || []).map(group => `<div class="mb-4"><h4 class="text-md font-semibold text-gray-300 mb-3 border-b-2 border-gray-700 pb-1">${group.quality}</h4><div class="space-y-2 pl-2">${(group.links || []).map((link, index) => `<a href="${link.url}" class="download-link flex justify-between items-center bg-gray-900 hover:bg-gray-800 p-3 rounded-lg transition"><span class="font-semibold text-cyan-400">Link ${index + 1}</span><span class="text-sm text-gray-400">${link.size}</span><span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span></a>`).join('')}</div></div>`).join('');
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
        movieContent.style.display = 'block';
        renderRecommendations(movie);
    } catch (error) {
        console.error("Error loading movie details:", error);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'block';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('movie-grid')) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');
        renderHomepage(searchTerm);
        handleRequestForm();
    } else if (document.getElementById('movie-content')) {
        renderMovieDetailPage();
        initializePopup();
        initializeMoviePageSearch();
    }
});
