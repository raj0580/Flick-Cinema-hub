import { getMovies, getMovieById, addMovieRequest } from './db.js';

// --- TELEGRAM POPUP LOGIC ---
const initializePopup = () => { /* ... (This function is unchanged and correct) ... */ };

// --- PAGE RENDERING LOGIC ---
const renderMovieCard = (movie) => { /* ... (This function is unchanged and correct) ... */ };

const renderHomepage = async () => {
    const movieGrid = document.getElementById('movie-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResultsSection = document.getElementById('no-results-section'); // Updated to new ID
    try {
        const movies = (await getMovies()).sort((a, b) => b.year - a.year);
        loadingSpinner.style.display = 'none';
        
        const displayMovies = (moviesToDisplay) => {
            movieGrid.innerHTML = moviesToDisplay.map(renderMovieCard).join('');
            // Show/hide the new request section
            if (moviesToDisplay.length === 0) {
                noResultsSection.style.display = 'block';
                // Pre-fill the request form with the user's search term
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
        
        // Initial display (show all movies, hide request form)
        displayMovies(movies);
        
        // Populate filters and add listeners
        const populateFilters = (movies) => { /* ... (unchanged) ... */ };
        populateFilters(movies);
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('request-submit-btn');
        const messageDiv = document.getElementById('request-message');
        
        const title = document.getElementById('request-title').value.trim();
        const notes = document.getElementById('request-notes').value.trim();

        if (!title) {
            messageDiv.textContent = "Movie title is required.";
            messageDiv.className = "mt-4 text-red-400";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        
        try {
            await addMovieRequest({
                title,
                notes,
                requestedAt: new Date()
            });
            messageDiv.textContent = "Thank you! Your request has been sent.";
            messageDiv.className = "mt-4 text-green-400";
            form.reset();
        } catch (err) {
            messageDiv.textContent = "Something went wrong. Please try again.";
            messageDiv.className = "mt-4 text-red-400";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";
        }
    });
};

const renderMovieDetailPage = async () => { /* ... (This function is unchanged and correct) ... */ };

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('movie-grid')) {
        renderHomepage();
        handleRequestForm(); // Initialize the request form handler
    } else if (document.getElementById('movie-content')) {
        renderMovieDetailPage();
        initializePopup();
    }
});
