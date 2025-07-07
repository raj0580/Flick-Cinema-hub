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
    const noResultsSection = document.getElementById('no-results-section');
    try {
        const movies = (await getMovies()).sort((a, b) => b.year - a.year);
        loadingSpinner.style.display = 'none';
        
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
            if (moviesToDisplay.length === 0) {
                noResultsSection.style.display = 'block';
                document.getElementById('request-title').value = document.getElementById('search-input').value;
            } else {
                noResultsSection.style.display = 'none';
            }
        };

        const filterMovies = () => {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const selectedGenre = document.getElementById('genre-filter').value;
            const selectedYear = document.getElementById('year-filter').value;
            const selectedLang = document.getElementById('lang-filter').value;
            const filtered = movies.filter(movie => ((movie.genres || []).includes(selectedGenre) || !selectedGenre) && movie.title.toLowerCase().includes(searchTerm) && (!selectedYear || movie.year == selectedYear) && (!selectedLang || movie.language === selectedLang));
            displayMovies(filtered);
        };
        
        if (movies.length === 0) {
            displayMovies([]);
        } else {
            populateFilters(movies);
            displayMovies(movies);
        }
        
        ['search-input', 'genre-filter', 'year-filter', 'lang-filter'].forEach(id => {
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
    const emailInput = document.getElementById('request-email');

    const savedUser = JSON.parse(localStorage.getItem('flickCinemaUser'));
    if (!savedUser) {
        userDetailsSection.classList.remove('hidden');
        nameInput.required = true;
        emailInput.required = true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('request-submit-btn');
        const messageDiv = document.getElementById('request-message');
        const title = document.getElementById('request-title').value.trim();
        const notes = document.getElementById('request-notes').value.trim();
        
        let userName = savedUser?.name;
        let userEmail = savedUser?.email;

        if (!savedUser) {
            userName = nameInput.value.trim();
            userEmail = emailInput.value.trim();
        }

        if (!title || (!savedUser && (!userName || !userEmail))) {
            messageDiv.textContent = "Please fill out all required fields.";
            messageDiv.className = "mt-4 text-red-400";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        
        try {
            await addMovieRequest({ title, notes, userName, userEmail, requestedAt: new Date() });
            
            if (!savedUser) {
                localStorage.setItem('flickCinemaUser', JSON.stringify({ name: userName, email: userEmail }));
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

    } catch (error) {
        console.error("Error loading movie details:", error);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'block';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('movie-grid')) {
        renderHomepage();
        handleRequestForm();
    } else if (document.getElementById('movie-content')) {
        renderMovieDetailPage();
        initializePopup();
    }
});
