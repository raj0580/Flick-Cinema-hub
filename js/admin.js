import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById } from './db.js';

// --- NEW --- ImgBB API Key
const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';

document.addEventListener('DOMContentLoaded', () => {
    const movieForm = document.getElementById('movie-form');
    const moviesList = document.getElementById('movies-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const moviesTable = document.getElementById('movies-table');
    const formTitle = document.getElementById('form-title');
    const movieIdInput = document.getElementById('movie-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const addLinkBtn = document.getElementById('add-link-btn');
    const downloadLinksContainer = document.getElementById('download-links-container');
    
    // --- NEW --- DOM Elements for poster upload
    const posterUploadInput = document.getElementById('poster-upload');
    const posterUrlInput = document.getElementById('poster-url');
    const uploadStatus = document.getElementById('upload-status');
    const posterPreview = document.getElementById('poster-preview');

    let editMode = false;

    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transition-all duration-300';
        toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500');
        
        toast.classList.remove('opacity-0', 'translate-y-full');
        toast.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-full');
        }, 3000);
    };

    const resetForm = () => {
        movieForm.reset();
        movieIdInput.value = '';
        formTitle.textContent = 'Add New Movie';
        editMode = false;
        cancelEditBtn.classList.add('hidden');
        downloadLinksContainer.innerHTML = '';
        addDownloadLinkField();

        // --- NEW --- Reset poster UI
        posterPreview.classList.add('hidden');
        posterPreview.src = '';
        uploadStatus.textContent = '';
        posterUploadInput.value = ''; // Clear the file input
    };

    const populateForm = (movie) => {
        formTitle.textContent = `Edit Movie: ${movie.title}`;
        editMode = true;
        cancelEditBtn.classList.remove('hidden');

        movieIdInput.value = movie.id;
        document.getElementById('title').value = movie.title;
        document.getElementById('year').value = movie.year;
        document.getElementById('description').value = movie.description;
        document.getElementById('trailer-url').value = movie.trailerUrl;
        document.getElementById('language').value = movie.language;
        document.getElementById('quality').value = movie.quality || '';
        document.getElementById('tags').value = movie.tags.join(', ');
        document.getElementById('screenshots').value = movie.screenshots.join('\n');
        
        // --- NEW --- Populate poster URL and preview
        posterUrlInput.value = movie.posterUrl;
        if (movie.posterUrl) {
            posterPreview.src = movie.posterUrl;
            posterPreview.classList.remove('hidden');
        }

        const genresSelect = document.getElementById('genres');
        Array.from(genresSelect.options).forEach(option => {
            option.selected = movie.genres.includes(option.value);
        });

        downloadLinksContainer.innerHTML = '';
        movie.downloadLinks.forEach(link => addDownloadLinkField(link.quality, link.size, link.url));
        if (!movie.downloadLinks || movie.downloadLinks.length === 0) {
            addDownloadLinkField();
        }

        window.scrollTo(0, 0);
    };

    const renderMoviesTable = async () => {
        loadingSpinner.style.display = 'block';
        moviesTable.classList.add('hidden');
        try {
            const movies = await getMovies();
            movies.sort((a,b) => a.title.localeCompare(b.title));
            moviesList.innerHTML = movies.map(movie => `
                <tr class="border-b border-gray-700 hover:bg-gray-900">
                    <td class="p-3"><img src="${movie.posterUrl}" alt="${movie.title}" class="h-16 w-auto rounded"></td>
                    <td class="p-3 font-semibold">${movie.title}</td>
                    <td class="p-3">${movie.year}</td>
                    <td class="p-3">
                        <button data-id="${movie.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded mr-2">Edit</button>
                        <button data-id="${movie.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded">Delete</button>
                    </td>
                </tr>
            `).join('');
            loadingSpinner.style.display = 'none';
            moviesTable.classList.remove('hidden');
        } catch (error) {
            console.error('Error fetching movies:', error);
            loadingSpinner.innerHTML = '<p class="text-red-500">Failed to load movies.</p>';
        }
    };

    const addDownloadLinkField = (quality = '', size = '', url = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `
            <input type="text" placeholder="Quality (e.g., 1080p)" value="${quality}" class="form-input flex-1 quality-input">
            <input type="text" placeholder="Size (e.g., 1.2GB)" value="${size}" class="form-input flex-1 size-input">
            <input type="url" placeholder="Download URL" value="${url}" class="form-input flex-2 url-input">
            <button type="button" class="remove-link-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">-</button>
        `;
        downloadLinksContainer.appendChild(div);
    };

    // --- NEW --- Function to handle ImgBB upload
    const handlePosterUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        uploadStatus.textContent = 'Uploading...';
        uploadStatus.style.color = '#9CA3AF'; // gray-400

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&expiration=600`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                const imageUrl = result.data.url;
                posterUrlInput.value = imageUrl; // Auto-fill the URL input
                posterPreview.src = imageUrl;
                posterPreview.classList.remove('hidden');
                uploadStatus.textContent = 'Upload successful!';
                uploadStatus.style.color = '#10B981'; // green-500
            } else {
                throw new Error(result.error.message || 'Unknown upload error');
            }
        } catch (error) {
            console.error('ImgBB Upload Error:', error);
            uploadStatus.textContent = `Upload failed: ${error.message}`;
            uploadStatus.style.color = '#EF4444'; // red-500
        }
    };
    
    // --- NEW --- Function to update preview from manual URL
    const updatePreviewFromUrl = () => {
        const url = posterUrlInput.value.trim();
        if (url) {
            posterPreview.src = url;
            posterPreview.classList.remove('hidden');
        } else {
            posterPreview.classList.add('hidden');
        }
    };


    addLinkBtn.addEventListener('click', () => addDownloadLinkField());
    downloadLinksContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-link-btn')) {
            e.target.parentElement.remove();
        }
    });

    movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!posterUrlInput.value) {
            showToast('A poster URL is required. Please upload an image or paste a URL.', true);
            return;
        }

        const movieData = {
            title: document.getElementById('title').value,
            year: Number(document.getElementById('year').value),
            description: document.getElementById('description').value,
            posterUrl: posterUrlInput.value, // The final URL comes from this input
            trailerUrl: document.getElementById('trailer-url').value,
            language: document.getElementById('language').value,
            quality: document.getElementById('quality').value.trim(),
            genres: [...document.getElementById('genres').options].filter(o => o.selected).map(o => o.value),
            tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            screenshots: document.getElementById('screenshots').value.split('\n').map(url => url.trim()).filter(Boolean),
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
            renderMoviesTable();
        } catch (error) {
            console.error('Error saving movie:', error);
            showToast('Error saving movie. Check console for details.', true);
        }
    });

    moviesList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const movie = await getMovieById(id);
            if (movie) populateForm(movie);
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this movie?')) {
                try {
                    await deleteMovie(id);
                    showToast('Movie deleted successfully!');
                    renderMoviesTable();
                } catch (error) {
                    console.error('Error deleting movie:', error);
                    showToast('Error deleting movie.', true);
                }
            }
        }
    });

    cancelEditBtn.addEventListener('click', resetForm);
    
    // --- NEW --- Add event listeners for the poster functionality
    posterUploadInput.addEventListener('change', handlePosterUpload);
    posterUrlInput.addEventListener('input', updatePreviewFromUrl);

    // Initial Load
    renderMoviesTable();
    addDownloadLinkField();
});
