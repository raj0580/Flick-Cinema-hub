import { getMovies, getMovieById } from './db.js';

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
        const movies = await getMovies();
        let allMovies = movies.sort((a, b) => b.year - a.year);

        loadingSpinner.style.display = 'none';
        if (allMovies.length === 0) {
            noResults.style.display = 'block';
            return;
        }

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

            const filtered = allMovies.filter(movie => {
                const genres = movie.genres || [];
                return movie.title.toLowerCase().includes(searchTerm) &&
                       (!selectedGenre || genres.includes(selectedGenre)) &&
                       (!selectedYear || movie.year == selectedYear) &&
                       (!selectedLang || movie.language === selectedLang);
            });
            displayMovies(filtered);
        };

        populateFilters(allMovies);
        displayMovies(allMovies);
        document.getElementById('search-input').addEventListener('input', filterMovies);
        document.getElementById('genre-filter').addEventListener('change', filterMovies);
        document.getElementById('year-filter').addEventListener('change', filterMovies);
        document.getElementById('lang-filter').addEventListener('change', filterMovies);

    } catch (error) {
        console.error("Error loading movies:", error);
        loadingSpinner.innerHTML = `<p class="text-red-500">Failed to load movies.</p>`;
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
        document.getElementById('movie-poster').src = movie.posterUrl;
        document.getElementById('movie-poster').alt = movie.title;
        document.getElementById('movie-title').textContent = movie.title;
        document.getElementById('movie-type').textContent = movie.type || 'Movie';
        document.getElementById('movie-description').textContent = movie.description;
        document.getElementById('movie-year').textContent = movie.year;
        document.getElementById('movie-language').textContent = movie.language;
        
        const genresContainer = document.getElementById('movie-genres');
        genresContainer.innerHTML = (movie.genres || []).map(g => `<span class="bg-gray-700 text-cyan-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">${g}</span>`).join('');
        
        const tagsContainer = document.getElementById('movie-tags');
        tagsContainer.innerHTML = (movie.tags || []).map(t => `<span class="bg-gray-600 text-gray-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${t}</span>`).join('');

        const trailerContainer = document.getElementById('trailer-container');
        if (movie.trailerUrl) {
            const videoId = movie.trailerUrl.split('v=')[1]?.split('&')[0] || movie.trailerUrl.split('/').pop();
            trailerContainer.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        }

        const screenshotsGrid = document.getElementById('screenshots-grid');
        screenshotsGrid.innerHTML = (movie.screenshots || []).map(url => `<a href="${url}" target="_blank"><img src="${url}" class="w-full h-auto rounded-lg object-cover" alt="Screenshot"></a>`).join('');

        const downloadsContainer = document.getElementById('downloads-container');
        let downloadsHtml = '';

        // --- CORRECTED LOGIC STARTS HERE ---

        // Check for Movie/Full Pack links first
        if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            if (movie.type === 'Web Series') {
                downloadsHtml += `<h3 class="text-xl font-bold mb-3 text-gray-300">Full Season Pack</h3>`;
            }
            downloadsHtml += movie.downloadLinks.map(link => `
                <a href="${link.url}" target="_blank" class="flex justify-between items-center bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition">
                    <span class="font-semibold text-cyan-400">${link.quality}</span>
                    <span class="text-sm text-gray-400">${link.size}</span>
                    <span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span>
                </a>
            `).join('');
        }

        // Check for individual episodes (for Web Series)
        if (movie.type === 'Web Series' && movie.episodes && movie.episodes.length > 0) {
            // Add a separator if there were also full pack links
            if (downloadsHtml !== '') {
                downloadsHtml += `<hr class="border-gray-700 my-6">`;
            }
            downloadsHtml += `<h3 class="text-xl font-bold mb-3 text-gray-300">Individual Episodes</h3>`;
            downloadsHtml += movie.episodes.map(episode => `
                <details class="bg-gray-800 rounded-lg overflow-hidden mb-3">
                    <summary class="font-bold text-lg p-4 bg-gray-700/50 hover:bg-gray-700">${episode.episodeTitle || 'Episode'}</summary>
                    <div class="p-4 space-y-3">
                        ${(episode.downloadLinks && episode.downloadLinks.length > 0) ? episode.downloadLinks.map(link => `
                            <a href="${link.url}" target="_blank" class="flex justify-between items-center bg-gray-900 hover:bg-gray-800 p-3 rounded-lg transition">
                                <span class="font-semibold text-cyan-400">${link.quality}</span>
                                <span class="text-sm text-gray-400">${link.size}</span>
                                <span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span>
                            </a>
                        `).join('') : '<p class="text-gray-400">No links for this episode.</p>'}
                    </div>
                </details>
            `).join('');
        }
        
        // --- CORRECTED LOGIC ENDS HERE ---

        if (downloadsHtml === '') {
            downloadsContainer.innerHTML = '<p class="text-gray-400">No download links available.</p>';
        } else {
            downloadsContainer.innerHTML = downloadsHtml;
        }

        movieContent.style.display = 'block';

    } catch (error) {
        console.error("Error loading movie details:", error);
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
    }
};

if (document.getElementById('movie-grid')) {
    renderHomepage();
} else if (document.getElementById('movie-content')) {
    renderMovieDetailPage();
}
