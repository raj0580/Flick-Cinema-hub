import { getMovies, getMovieById, addMovieRequest } from './db.js';

const initializePopup = () => { /* ... (This function is unchanged and correct) ... */ };
const renderMovieCard = (movie) => { /* ... (This function is unchanged and correct) ... */ };

const renderHomepage = async () => {
    const movieGrid = document.getElementById('movie-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResultsSection = document.getElementById('no-results-section');
    try {
        const movies = (await getMovies()).sort((a, b) => b.year - a.year);
        loadingSpinner.style.display = 'none';
        
        const populateFilters = (movies) => { /* ... (This function is unchanged and correct) ... */ };
        const displayMovies = (moviesToDisplay) => {
            movieGrid.innerHTML = moviesToDisplay.map(renderMovieCard).join('');
            if (moviesToDisplay.length === 0) {
                noResultsSection.style.display = 'block';
                document.getElementById('request-title').value = document.getElementById('search-input').value;
            } else {
                noResultsSection.style.display = 'none';
            }
        };
        const filterMovies = () => { /* ... (This function is unchanged and correct) ... */ };
        
        if (movies.length === 0) { displayMovies([]); }
        else { populateFilters(movies); displayMovies(movies); }
        
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

    // Check localStorage for existing user info
    const savedUser = JSON.parse(localStorage.getItem('flickCinemaUser'));
    if (!savedUser) {
        // If no user is saved, show the name/email fields and make them required
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

        // If user details were not in storage, get them from the form
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
            await addMovieRequest({
                title,
                notes,
                userName,
                userEmail,
                requestedAt: new Date()
            });
            
            // If this was their first time, save their details to localStorage
            if (!savedUser) {
                localStorage.setItem('flickCinemaUser', JSON.stringify({ name: userName, email: userEmail }));
                userDetailsSection.classList.add('hidden'); // Hide for next time
            }

            messageDiv.textContent = "Thank you! Your request has been sent.";
            messageDiv.className = "mt-4 text-green-400";
            form.reset();
             // Pre-fill the title again after reset
            document.getElementById('request-title').value = title;

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
        handleRequestForm();
    } else if (document.getElementById('movie-content')) {
        renderMovieDetailPage();
        initializePopup();
    }
});
