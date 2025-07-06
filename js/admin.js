import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById } from './db.js';

const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';
const ALL_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'];

// --- NEW HELPER FUNCTION TO CLEAN URLs ---
const cleanDownloadUrl = (rawUrl) => {
    // If the URL is empty or doesn't contain the pattern, return it as-is.
    if (!rawUrl || !rawUrl.includes('?link=')) {
        return rawUrl;
    }
    try {
        // Use URL object to safely parse parameters
        const url = new URL(rawUrl);
        const encodedLink = url.searchParams.get('link');
        
        if (encodedLink) {
            // If the 'link' parameter exists, decode it and return the clean URL.
            return decodeURIComponent(encodedLink);
        }
    } catch (e) {
        // If 'new URL()' fails (e.g., not a full valid URL), log it but don't crash.
        console.warn("Could not parse URL for cleaning, returning original value:", rawUrl, e);
    }
    // As a fallback, return the original URL if anything goes wrong.
    return rawUrl;
};


document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE DOM ELEMENTS ---
    const movieForm = document.getElementById('movie-form');
    const moviesList = document.getElementById('movies-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const moviesTable = document.getElementById('movies-table');
    const formTitle = document.getElementById('form-title');
    const movieIdInput = document.getElementById('movie-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const posterUrlInput = document.getElementById('poster-url');
    const posterPreview = document.getElementById('poster-preview');
    const genresContainer = document.getElementById('genres-container');
    const screenshotsContainer = document.getElementById('screenshots-container');
    const addScreenshotBtn = document.getElementById('add-screenshot-btn');
    const seriesDownloadsSection = document.getElementById('series-downloads-section');
    const movieLinksContainer = document.getElementById('movie-links-container');
    const addMovieLinkBtn = document.getElementById('add-movie-link-btn');
    const episodesContainer = document.getElementById('episodes-container');
    const addEpisodeBtn = document.getElementById('add-episode-btn');
    
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
        document.querySelector('input[name="type"][value="Movie"]').checked = true;
        handleTypeChange();
        movieIdInput.value = '';
        formTitle.textContent = 'Add New Content';
        editMode = false;
        cancelEditBtn.classList.add('hidden');
        posterPreview.classList.add('hidden');
        posterPreview.src = '';
        screenshotsContainer.innerHTML = '';
        addScreenshotField();
        movieLinksContainer.innerHTML = '';
        addMovieDownloadLinkField();
        episodesContainer.innerHTML = '';
        addEpisodeField();
        window.scrollTo(0, 0);
    };

    const populateForm = (content) => {
        resetForm();
        formTitle.textContent = `Edit Content: ${content.title}`;
        editMode = true;
        cancelEditBtn.classList.remove('hidden');

        movieIdInput.value = content.id;
        document.getElementById('title').value = content.title;
        document.getElementById('year').value = content.year;
        document.getElementById('description').value = content.description;
        document.getElementById('trailer-url').value = content.trailerUrl;
        document.getElementById('language').value = content.language;
        document.getElementById('quality').value = content.quality || '';
        document.getElementById('tags').value = content.tags ? content.tags.join(', ') : '';
        posterUrlInput.value = content.posterUrl;
        if (content.posterUrl) {
            posterPreview.src = content.posterUrl;
            posterPreview.classList.remove('hidden');
        }

        const selectedType = content.type || 'Movie';
        document.querySelector(`input[name="type"][value="${selectedType}"]`).checked = true;
        handleTypeChange();

        const contentGenres = content.genres || [];
        document.querySelectorAll('.genre-checkbox').forEach(checkbox => {
            checkbox.checked = contentGenres.includes(checkbox.value);
        });

        screenshotsContainer.innerHTML = '';
        (content.screenshots || []).forEach(url => addScreenshotField(url));
        if (screenshotsContainer.childElementCount === 0) addScreenshotField();

        movieLinksContainer.innerHTML = '';
        (content.downloadLinks || []).forEach(link => addMovieDownloadLinkField(link.quality, link.size, link.url));
        if (movieLinksContainer.childElementCount === 0) addMovieDownloadLinkField();
        
        if (selectedType === 'Web Series') {
            episodesContainer.innerHTML = '';
            (content.episodes || []).forEach(ep => addEpisodeField(ep.episodeTitle, ep.downloadLinks));
            if (episodesContainer.childElementCount === 0) addEpisodeField();
        }

        window.scrollTo(0, 0);
    };

    const renderGenreCheckboxes = () => {
        genresContainer.innerHTML = ALL_GENRES.map(genre => `<div><input type="checkbox" id="genre-${genre.toLowerCase()}" value="${genre}" class="genre-checkbox"><label for="genre-${genre.toLowerCase()}" class="genre-checkbox-label">${genre}</label></div>`).join('');
    };

    // --- DYNAMIC FIELD FUNCTIONS ---
    const addMovieDownloadLinkField = (quality = '', size = '', url = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `<input type="text" placeholder="Quality (e.g., 1080p)" value="${quality}" class="form-input flex-1"><input type="text" placeholder="Size (e.g., 1.2GB)" value="${size}" class="form-input flex-1"><input type="url" placeholder="Download URL" value="${url}" class="form-input flex-2"><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">-</button>`;
        movieLinksContainer.appendChild(div);
    };
    
    const addEpisodeField = (title = '', links = []) => {
        const episodeId = `ep-${Date.now()}`;
        const div = document.createElement('div');
        div.className = 'episode-field p-4 border border-gray-700 rounded-lg bg-gray-900/50';
        div.innerHTML = `<div class="flex justify-between items-center mb-4"><input type="text" placeholder="Episode Title (e.g., S01E01)" value="${title}" class="form-input w-full mr-4 episode-title-input"><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">Remove Ep</button></div><div class="space-y-2 episode-links-container"></div><button type="button" data-container="${episodeId}" class="add-episode-link-btn mt-2 text-sm bg-gray-600 hover:bg-gray-700 py-1 px-3 rounded">+ Add Link</button>`;
        div.querySelector('.episode-links-container').id = episodeId;
        episodesContainer.appendChild(div);
        
        const container = div.querySelector('.episode-links-container');
        if (links.length > 0) {
            links.forEach(link => addEpisodeDownloadLinkField(container, link.quality, link.size, link.url));
        } else {
            addEpisodeDownloadLinkField(container);
        }
    };
    
    const addEpisodeDownloadLinkField = (container, quality = '', size = '', url = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `<input type="text" placeholder="Quality" value="${quality}" class="form-input flex-1"><input type="text" placeholder="Size" value="${size}" class="form-input flex-1"><input type="url" placeholder="URL" value="${url}" class="form-input flex-2"><button type="button" class="remove-btn bg-red-600/70 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">-</button>`;
        container.appendChild(div);
    };
    
    const addScreenshotField = (url = '') => {
        const fieldId = `ss-upload-${Date.now()}-${Math.random()}`;
        const div = document.createElement('div');
        div.className = 'upload-field screenshot-field';
        div.innerHTML = `<div class="flex items-center justify-between mb-2"><div class="flex items-center gap-4"><label for="${fieldId}" class="cursor-pointer text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded">Upload</label><input type="file" id="${fieldId}" class="screenshot-upload-input hidden" accept="image/*"><span class="upload-status text-xs text-gray-400"></span></div><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Remove</button></div><input type="url" placeholder="Or paste screenshot URL" value="${url}" class="form-input w-full screenshot-url-input"><img src="${url}" alt="Screenshot Preview" class="screenshot-preview mt-2 rounded ${url ? '' : 'hidden'}" style="max-height: 150px;">`;
        screenshotsContainer.appendChild(div);
    };

    // --- IMAGE UPLOAD LOGIC ---
    const handleImageUpload = async (file, urlInput, previewEl, statusEl) => {
        if (!file) return;
        statusEl.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                urlInput.value = result.data.url;
                previewEl.src = result.data.url;
                previewEl.classList.remove('hidden');
                statusEl.textContent = 'Success!';
            } else { throw new Error(result.error.message); }
        } catch (error) {
            statusEl.textContent = 'Upload failed!';
        }
    };

    // --- EVENT LISTENERS ---
    const handleTypeChange = () => {
        const isSeries = document.querySelector('input[name="type"]:checked').value === 'Web Series';
        seriesDownloadsSection.classList.toggle('hidden', !isSeries);
    };
    document.querySelectorAll('input[name="type"]').forEach(radio => radio.addEventListener('change', handleTypeChange));
    
    addMovieLinkBtn.addEventListener('click', () => addMovieDownloadLinkField());
    addEpisodeBtn.addEventListener('click', () => addEpisodeField());
    addScreenshotBtn.addEventListener('click', () => addScreenshotField());
    cancelEditBtn.addEventListener('click', resetForm);
    
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('poster-upload-btn')) e.target.nextElementSibling.click();
        if (e.target.classList.contains('remove-btn')) e.target.closest('.flex, .episode-field, .screenshot-field').remove();
        if (e.target.classList.contains('add-episode-link-btn')) {
            const container = document.getElementById(e.target.dataset.container);
            if (container) addEpisodeDownloadLinkField(container);
        }
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('poster-upload-input')) {
            handleImageUpload(e.target.files[0], posterUrlInput, posterPreview, e.target.nextElementSibling);
        } else if (e.target.classList.contains('screenshot-upload-input')) {
            const field = e.target.closest('.screenshot-field');
            handleImageUpload(e.target.files[0], field.querySelector('.screenshot-url-input'), field.querySelector('.screenshot-preview'), field.querySelector('.upload-status'));
        }
    });
    
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'poster-url') {
             posterPreview.src = e.target.value;
             posterPreview.classList.toggle('hidden', !e.target.value);
        } else if (e.target.classList.contains('screenshot-url-input')) {
            const previewEl = e.target.closest('.screenshot-field').querySelector('.screenshot-preview');
            previewEl.src = e.target.value;
            previewEl.classList.toggle('hidden', !e.target.value);
        }
    });

    movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!posterUrlInput.value) return showToast('Poster URL is required.', true);

        const type = document.querySelector('input[name="type"]:checked').value;
        const movieData = {
            type: type,
            title: document.getElementById('title').value,
            year: Number(document.getElementById('year').value),
            description: document.getElementById('description').value,
            posterUrl: posterUrlInput.value,
            trailerUrl: document.getElementById('trailer-url').value,
            language: document.getElementById('language').value,
            quality: document.getElementById('quality').value.trim(),
            genres: [...document.querySelectorAll('.genre-checkbox:checked')].map(cb => cb.value),
            tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            screenshots: [...screenshotsContainer.querySelectorAll('.screenshot-url-input')].map(input => input.value.trim()).filter(Boolean),
            downloadLinks: [...movieLinksContainer.querySelectorAll('.flex')].map(div => ({
                quality: div.children[0].value.trim(),
                size: div.children[1].value.trim(),
                // --- MODIFICATION HERE --- Call the cleaning function ---
                url: cleanDownloadUrl(div.children[2].value.trim()),
            })).filter(link => link.url),
        };

        if (type === 'Web Series') {
            movieData.episodes = [...episodesContainer.querySelectorAll('.episode-field')].map(epField => ({
                episodeTitle: epField.querySelector('.episode-title-input').value.trim(),
                downloadLinks: [...epField.querySelectorAll('.episode-links-container .flex')].map(linkDiv => ({
                    quality: linkDiv.children[0].value.trim(),
                    size: linkDiv.children[1].value.trim(),
                    // --- MODIFICATION HERE --- Call the cleaning function ---
                    url: cleanDownloadUrl(linkDiv.children[2].value.trim()),
                })).filter(link => link.url)
            })).filter(ep => ep.episodeTitle);
        }
        
        try {
            if (editMode) {
                await updateMovie(movieIdInput.value, movieData);
                showToast('Content updated successfully!');
            } else {
                await addMovie(movieData);
                showToast('Content added successfully!');
            }
            resetForm();
            await renderMoviesTable();
        } catch (error) {
            showToast(`Error saving content: ${error.message}`, true);
        }
    });
    
    moviesList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const content = await getMovieById(id);
            if (content) populateForm(content);
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure?')) {
                try {
                    await deleteMovie(id);
                    showToast('Content deleted!');
                    await renderMoviesTable();
                } catch (error) { showToast(`Error: ${error.message}`, true); }
            }
        }
    });

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
                    <td class="p-3"><span class="text-xs font-bold ${movie.type === 'Web Series' ? 'text-green-400' : 'text-cyan-400'}">${movie.type || 'Movie'}</span></td>
                    <td class="p-3">
                        <button data-id="${movie.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded mr-2">Edit</button>
                        <button data-id="${movie.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            moviesList.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Failed to load content.</td></tr>`;
        } finally {
            loadingSpinner.innerHTML = '';
            moviesTable.classList.remove('hidden');
        }
    };

    // --- INITIALIZATION ---
    renderGenreCheckboxes();
    resetForm();
    renderMoviesTable();
});
