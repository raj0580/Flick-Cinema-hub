import { getMovies, getMovieById } from './db.js';

const renderMovieCard = (movie) => `
    <a href="movie.html?id=${movie.id}" class="group block bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-shadow duration-300">
        <div class="relative">
            <img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-300">
            <div class="absolute top-2 right-2 bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded">${movie.quality || 'HD'}</div>
        </div>
        <div class="p-3">
            <h3 class="text-md font-bold truncate group-hover:text-cyan-400">${movie.title}</h3>
            <div class="text-xs text-gray-400 mt-1">
                <span>${movie.year}</span> •
                <span class="truncate">${movie.genres.join(', ')}</span>
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
        let allMovies = movies.sort((a, b) => b.year - a.year); // Sort by most recent year

        loadingSpinner.style.display = 'none';

        if (allMovies.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        const populateFilters = (movies) => {
            const genres = [...new Set(movies.flatMap(m => m.genres))].sort();
            const years = [...new Set(movies.map(m => m.year))].sort((a,b) => b-a);
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
        }

        const filterMovies = () => {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const selectedGenre = document.getElementById('genre-filter').value;
            const selectedYear = document.getElementById('year-filter').value;
            const selectedLang = document.getElementById('lang-filter').value;

            const filtered = allMovies.filter(movie => {
                const matchesSearch = movie.title.toLowerCase().includes(searchTerm);
                const matchesGenre = !selectedGenre || movie.genres.includes(selectedGenre);
                const matchesYear = !selectedYear || movie.year == selectedYear;
                const matchesLang = !selectedLang || movie.language === selectedLang;
                return matchesSearch && matchesGenre && matchesYear && matchesLang;
            });
            displayMovies(filtered);
        }

        populateFilters(allMovies);
        displayMovies(allMovies);

        document.getElementById('search-input').addEventListener('input', filterMovies);
        document.getElementById('genre-filter').addEventListener('change', filterMovies);
        document.getElementById('year-filter').addEventListener('change', filterMovies);
        document.getElementById('lang-filter').addEventListener('change', filterMovies);

    } catch (error) {
        console.error("Error loading movies:", error);
        loadingSpinner.innerHTML = `<p class="text-red-500">Failed to load movies. Please try again later.</p>`;
    }
};

const renderMovieDetailPage = async () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('id');

    if (!movieId) {
        window.location.href = 'index.html';
        return;
    }

    const loadingSpinner = document.getElementById('loading-spinner');
    const movieContent = document.getElementById('movie-content');
    const errorMessage = document.getElementById('error-message');

    try {
        const movie = await getMovieById(movieId);
        loadingSpinner.style.display = 'none';

        if (!movie) {
            errorMessage.style.display = 'block';
            return;
        }

        // Update page title
        document.title = `${movie.title} - Flick Cinema`;

        // Populate content
        document.getElementById('movie-poster').src = movie.posterUrl;
        document.getElementById('movie-poster').alt = movie.title;
        document.getElementById('movie-title').textContent = movie.title;
        document.getElementById('movie-description').textContent = movie.description;
        document.getElementById('movie-year').textContent = movie.year;
        document.getElementById('movie-language').textContent = movie.language;

        const genresContainer = document.getElementById('movie-genres');
        genresContainer.innerHTML = movie.genres.map(g => `<span class="bg-gray-700 text-cyan-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">${g}</span>`).join('');
        
        const tagsContainer = document.getElementById('movie-tags');
        tagsContainer.innerHTML = movie.tags.map(t => `<span class="bg-gray-600 text-gray-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${t}</span>`).join('');

        // Trailer
        const trailerContainer = document.getElementById('trailer-container');
        if (movie.trailerUrl) {
            const videoId = movie.trailerUrl.split('v=')[1]?.split('&')[0] || movie.trailerUrl.split('/').pop();
            trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            trailerContainer.innerHTML = '<p class="text-gray-400">No trailer available.</p>';
        }
        
        // Screenshots
        const screenshotsGrid = document.getElementById('screenshots-grid');
        if (movie.screenshots && movie.screenshots.length > 0) {
            screenshotsGrid.innerHTML = movie.screenshots.map(url => `
                <a href="${url}" target="_blank">
                    <img src="${url}" class="w-full h-auto rounded-lg object-cover" alt="Screenshot">
                </a>
            `).join('');
        } else {
            screenshotsGrid.innerHTML = '<p class="text-gray-400">No screenshots available.</p>';
        }

        // Download Links
        const downloadLinksContainer = document.getElementById('download-links');
        if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            downloadLinksContainer.innerHTML = movie.downloadLinks.map(link => `
                <a href="${link.url}" target="_blank" class="flex justify-between items-center bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition">
                    <span class="font-semibold text-cyan-400">${link.quality}</span>
                    <span class="text-sm text-gray-400">${link.size}</span>
                    <span class="bg-cyan-500 text-white text-sm font-bold py-1 px-3 rounded">Download</span>
                </a>
            `).join('');
        } else {
             downloadLinksContainer.innerHTML = '<p class="text-gray-400">No download links available.</p>';
        }

        movieContent.style.display = 'block';

    } catch (error) {
        console.error("Error loading movie details:", error);
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
    }
};


// Run the correct function based on the page
if (document.getElementById('movie-grid')) {
    renderHomepage();
} else if (document.getElementById('movie-content')) {
    renderMovieDetailPage();
}