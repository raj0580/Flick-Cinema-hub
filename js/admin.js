import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById } from './db.js';

const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';

document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE DOM ELEMENTS ---
    const movieForm = document.getElementById('movie-form');
    const moviesList = document.getElementById('movies-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const moviesTable = document.getElementById('movies-table');
    const formTitle = document.getElementById('form-title');
    const movieIdInput = document.getElementById('movie-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    // Poster elements
    const posterUrlInput = document.getElementById('poster-url');
    const posterPreview = document.getElementById('poster-preview');

    // Screenshot elements
    const screenshotsContainer = document.getElementById('screenshots-container');
    const addScreenshotBtn = document.getElementById('add-screenshot-btn');

    // Download link elements
    const downloadLinksContainer = document.getElementById('download-links-container');
    const addLinkBtn = document.getElementById('add-link-btn');

    let editMode = false;

    // --- HELPER FUNCTIONS ---
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transition-all duration-300';
        toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500', 'opacity-100', 'translate-y-0');
        setTimeout(() => toast.classList.add('opacity-0', 'translate-y-full'), 3000);
    };

    const resetForm = () => {
        movieForm.reset();
        movieIdInput.value = '';
        formTitle.textContent = 'Add New Movie';
        editMode = false;
        cancelEditBtn.classList.add('hidden');
        
        posterPreview.classList.add('hidden');
        posterPreview.src = '';

        screenshotsContainer.innerHTML = '';
        addScreenshotField();

        downloadLinksContainer.innerHTML = '';
        addDownloadLinkField();
        
        window.scrollTo(0, 0);
    };

    const populateForm = (movie) => {
        resetForm(); // Start with a clean slate
        formTitle.textContent = `Edit Movie: ${movie.title}`;
        editMode = true;
        cancelEditBtn.classList.remove('hidden');

        // --- Populate standard fields ---
        movieIdInput.value = movie.id;
        document.getElementById('title').value = movie.title;
        document.getElementById('year').value = movie.year;
        document.getElementById('description').value = movie.description;
        document.getElementById('trailer-url').value = movie.trailerUrl;
        document.getElementById('language').value = movie.language;
        document.getElementById('quality').value = movie.quality || '';
        document.getElementById('tags').value = movie.tags ? movie.tags.join(', ') : '';

        // --- BUG FIX: Populate poster correctly ---
        posterUrlInput.value = movie.posterUrl;
        if (movie.posterUrl) {
            posterPreview.src = movie.posterUrl;
            posterPreview.classList.remove('hidden');
        }

        // --- Populate genres ---
        const genresSelect = document.getElementById('genres');
        const movieGenres = movie.genres || [];
        Array.from(genresSelect.options).forEach(option => {
            option.selected = movieGenres.includes(option.value);
        });

        // --- Populate screenshots ---
        screenshotsContainer.innerHTML = '';
        if (movie.screenshots && movie.screenshots.length > 0) {
            movie.screenshots.forEach(url => addScreenshotField(url));
        } else {
            addScreenshotField(); // Add one empty field if none exist
        }

        // --- Populate download links ---
        downloadLinksContainer.innerHTML = '';
        if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            movie.downloadLinks.forEach(link => addDownloadLinkField(link.quality, link.size, link.url));
        } else {
            addDownloadLinkField();
        }

        window.scrollTo(0, 0);
    };

    // --- DYNAMIC FIELD FUNCTIONS ---
    const addDownloadLinkField = (quality = '', size = '', url = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `
            <input type="text" placeholder="Quality (e.g., 1080p)" value="${quality}" class="form-input flex-1 quality-input">
            <input type="text" placeholder="Size (e.g., 1.2GB)" value="${size}" class="form-input flex-1 size-input">
            <input type="url" placeholder="Download URL" value="${url}" class="form-input flex-2 url-input">
            <button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">-</button>
        `;
        downloadLinksContainer.appendChild(div);
    };

    const addScreenshotField = (url = '') => {
        const fieldId = `ss-upload-${Date.now()}-${Math.random()}`; // Unique ID for the file input's label
        const div = document.createElement('div');
        div.className = 'upload-field screenshot-field';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-4">
                    <label for="${fieldId}" class="cursor-pointer text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded">Upload</label>
                    <input type="file" id="${fieldId}" class="screenshot-upload-input hidden" accept="image/*">
                    <span class="upload-status text-xs text-gray-400"></span>
                </div>
                <button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Remove</button>
            </div>
            <input type="url" placeholder="Or paste screenshot URL" value="${url}" class="form-input w-full screenshot-url-input">
            <img src="${url}" alt="Screenshot Preview" class="screenshot-preview mt-2 rounded ${url ? '' : 'hidden'}" style="max-height: 150px;">
        `;
        screenshotsContainer.appendChild(div);
    };


    // --- IMAGE UPLOAD LOGIC ---
    const handleImageUpload = async (file, urlInput, previewEl, statusEl) => {
        if (!file) return;

        statusEl.textContent = 'Uploading...';
        statusEl.style.color = '#9CA3AF';

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                const imageUrl = result.data.url;
                urlInput.value = imageUrl;
                previewEl.src = imageUrl;
                previewEl.classList.remove('hidden');
                statusEl.textContent = 'Success!';
                statusEl.style.color = '#10B981';
            } else { throw new Error(result.error.message); }
        } catch (error) {
            console.error('ImgBB Upload Error:', error);
            statusEl.textContent = 'Upload failed!';
            statusEl.style.color = '#EF4444';
        }
    };


    // --- EVENT LISTENERS ---
    // Poster Upload
    movieForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('poster-upload-btn')) {
            e.target.nextElementSibling.click(); // Trigger the hidden file input
        }
    });
    movieForm.addEventListener('change', (e) => {
        if (e.target.classList.contains('poster-upload-input')) {
            const statusEl = e.target.nextElementSibling;
            handleImageUpload(e.target.files[0], posterUrlInput, posterPreview, statusEl);
        }
    });
    posterUrlInput.addEventListener('input', () => {
        posterPreview.src = posterUrlInput.value;
        posterPreview.classList.toggle('hidden', !posterUrlInput.value);
    });

    // Dynamic fields (delegated listeners)
    addScreenshotBtn.addEventListener('click', () => addScreenshotField());
    addLinkBtn.addEventListener('click', () => addDownloadLinkField());
    
    screenshotsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) e.target.closest('.screenshot-field').remove();
    });
    screenshotsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('screenshot-upload-input')) {
            const field = e.target.closest('.screenshot-field');
            const urlInput = field.querySelector('.screenshot-url-input');
            const previewEl = field.querySelector('.screenshot-preview');
            const statusEl = field.querySelector('.upload-status');
            handleImageUpload(e.target.files[0], urlInput, previewEl, statusEl);
        }
    });
     screenshotsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('screenshot-url-input')) {
            const field = e.target.closest('.screenshot-field');
            const previewEl = field.querySelector('.screenshot-preview');
            previewEl.src = e.target.value;
            previewEl.classList.toggle('hidden', !e.target.value);
        }
    });
    
    downloadLinksContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) e.target.closest('.flex').remove();
    });

    cancelEditBtn.addEventListener('click', resetForm);

    // Form Submission
    movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!posterUrlInput.value) return showToast('Poster URL is required.', true);

        const movieData = {
            title: document.getElementById('title').value,
            year: Number(document.getElementById('year').value),
            description: document.getElementById('description').value,
            posterUrl: posterUrlInput.value,
            trailerUrl: document.getElementById('trailer-url').value,
            language: document.getElementById('language').value,
            quality: document.getElementById('quality').value.trim(),
            genres: [...document.getElementById('genres').options].filter(o => o.selected).map(o => o.value),
            tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            screenshots: [...screenshotsContainer.querySelectorAll('.screenshot-url-input')].map(input => input.value.trim()).filter(Boolean),
            downloadLinks: [...downloadLinksContainer.querySelectorAll('.flex')].map(div => ({
                quality: div.querySelector('.quality-input').value.trim(),
                size: div.querySelector('.size-input').value.trim(),
                url: div.querySelector('.url-input').value.trim(),
            })).filter(link => link.quality && link.url)
        };
        
        try {
            if (editMode) {
                await updateMovie(movieIdInput.value, movieData);
                showToast('Movie updated successfully!');
            } else {
                await addMovie(movieData);
                showToast('Movie added successfully!');
            }
            resetForm();
            await renderMoviesTable();
        } catch (error) {
            showToast(`Error saving movie: ${error.message}`, true);
        }
    });
    
    // Existing Movies Table
    moviesList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const movie = await getMovieById(id);
            if (movie) populateForm(movie);
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure?')) {
                try {
                    await deleteMovie(id);
                    showToast('Movie deleted!');
                    await renderMoviesTable();
                } catch (error) {
                    showToast(`Error deleting movie: ${error.message}`, true);
                }
            }
        }
    });

    // --- INITIALIZATION ---
    const renderMoviesTable = async () => {
        loadingSpinner.innerHTML = `<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>`;
        moviesTable.classList.add('hidden');
        try {
            const movies = (await getMovies()).sort((a,b) => a.title.localeCompare(b.title));
            moviesList.innerHTML = movies.map(movie => `
                <tr class="border-b border-gray-700 hover:bg-gray-900">
                    <td class="p-3"><img src="${movie.posterUrl}" alt="${movie.title}" class="h-16 w-auto rounded object-cover"></td>
                    <td class="p-3 font-semibold">${movie.title}</td>
                    <td class="p-3">${movie.year}</td>
                    <td class="p-3">
                        <button data-id="${movie.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded mr-2">Edit</button>
                        <button data-id="${movie.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            moviesList.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Failed to load movies.</td></tr>`;
        } finally {
            loadingSpinner.innerHTML = '';
            moviesTable.classList.remove('hidden');
        }
    };

    resetForm(); // Start with a fresh form
    renderMoviesTable();
});
