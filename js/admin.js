import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById } from './db.js';

const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';
const ALL_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'];

const cleanDownloadUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.includes('?link=')) return rawUrl;
    try {
        const url = new URL(rawUrl);
        const encodedLink = url.searchParams.get('link');
        return encodedLink ? decodeURIComponent(encodedLink) : rawUrl;
    } catch (e) { return rawUrl; }
};

document.addEventListener('DOMContentLoaded', () => {
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
    const seriesDownloadsSection = document.getElementById('series-downloads-section');
    const movieQualityGroupsContainer = document.getElementById('movie-quality-groups-container');
    const episodesContainer = document.getElementById('episodes-container');
    
    let editMode = false;

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
        screenshotsContainer.innerHTML = ''; addScreenshotField();
        movieQualityGroupsContainer.innerHTML = ''; addQualityGroupField(movieQualityGroupsContainer);
        episodesContainer.innerHTML = ''; addEpisodeField();
        window.scrollTo(0, 0);
    };

    const populateForm = (content) => {
        resetForm();
        formTitle.textContent = `Edit Content: ${content.title}`;
        editMode = true;
        cancelEditBtn.classList.remove('hidden');
        movieIdInput.value = content.id;
        
        ['title', 'year', 'description', 'trailerUrl', 'language', 'quality', 'posterUrl'].forEach(key => {
            const el = document.getElementById(key);
            if (el && content[key]) el.value = content[key];
        });
        document.getElementById('tags').value = content.tags ? content.tags.join(', ') : '';
        if (posterUrlInput.value) { posterPreview.src = posterUrlInput.value; posterPreview.classList.remove('hidden'); }
        
        const selectedType = content.type || 'Movie';
        document.querySelector(`input[name="type"][value="${selectedType}"]`).checked = true;
        handleTypeChange();
        
        document.querySelectorAll('.genre-checkbox').forEach(cb => cb.checked = (content.genres || []).includes(cb.value));
        
        screenshotsContainer.innerHTML = '';
        (content.screenshots || []).forEach(url => addScreenshotField(url));
        if (screenshotsContainer.childElementCount === 0) addScreenshotField();

        // --- BACKWARD-COMPATIBLE POPULATION ---
        movieQualityGroupsContainer.innerHTML = '';
        const isNewFormat = content.downloadLinks && content.downloadLinks.length > 0 && typeof content.downloadLinks[0].links !== 'undefined';

        if (isNewFormat) {
            (content.downloadLinks || []).forEach(group => addQualityGroupField(movieQualityGroupsContainer, group.quality, group.links));
        } else {
            // It's the OLD format, convert it to the new UI structure
            (content.downloadLinks || []).forEach(oldLink => {
                addQualityGroupField(movieQualityGroupsContainer, oldLink.quality, [{ size: oldLink.size, url: oldLink.url }]);
            });
        }
        if (movieQualityGroupsContainer.childElementCount === 0) addQualityGroupField(movieQualityGroupsContainer);
        
        episodesContainer.innerHTML = '';
        if (selectedType === 'Web Series') {
            (content.episodes || []).forEach(ep => addEpisodeField(ep.episodeTitle, ep.qualityGroups));
            if (episodesContainer.childElementCount === 0) addEpisodeField();
        }
        window.scrollTo(0, 0);
    };
    
    const addScreenshotField = (url = '') => {
        const fieldId = `ss-upload-${Date.now()}-${Math.random()}`;
        const div = document.createElement('div');
        div.className = 'upload-field screenshot-field';
        div.innerHTML = `<div class="flex items-center justify-between mb-2"><div class="flex items-center gap-4"><label for="${fieldId}" class="cursor-pointer text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded">Upload</label><input type="file" id="${fieldId}" class="screenshot-upload-input hidden" accept="image/*"><span class="upload-status text-xs text-gray-400"></span></div><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Remove</button></div><input type="url" placeholder="Or paste screenshot URL" value="${url}" class="form-input w-full screenshot-url-input"><img src="${url}" alt="Screenshot Preview" class="screenshot-preview mt-2 rounded ${url ? '' : 'hidden'}" style="max-height: 150px;">`;
        screenshotsContainer.appendChild(div);
    };

    const addQualityGroupField = (parentContainer, quality = '', links = []) => {
        const div = document.createElement('div');
        div.className = 'quality-group space-y-3';
        div.innerHTML = `<div class="flex items-center gap-4"><input type="text" placeholder="Quality Name (e.g., 1080p)" value="${quality}" class="form-input w-full quality-name-input"><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">Remove Group</button></div><div class="space-y-2 link-list"></div><button type="button" class="add-link-to-group-btn text-sm bg-gray-600 hover:bg-gray-700 py-1 px-3 rounded">+ Add Link Mirror</button>`;
        parentContainer.appendChild(div);
        const linkList = div.querySelector('.link-list');
        if (links.length > 0) links.forEach(link => addLinkFieldToGroup(linkList, link.size, link.url));
        else addLinkFieldToGroup(linkList);
    };

    const addLinkFieldToGroup = (linkList, size = '', url = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `<input type="text" placeholder="Size (e.g., 1.2GB)" value="${size}" class="form-input flex-1 size-input"><input type="url" placeholder="Download URL" value="${url}" class="form-input flex-2 url-input"><button type="button" class="remove-btn bg-red-600/70 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">-</button>`;
        linkList.appendChild(div);
    };

    const addEpisodeField = (title = '', qualityGroups = []) => {
        const div = document.createElement('div');
        div.className = 'episode-field space-y-4';
        div.innerHTML = `<div class="flex items-center gap-4"><input type="text" placeholder="Episode Title (e.g., S01E01)" value="${title}" class="form-input w-full episode-title-input"><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded">Remove Ep</button></div><div class="space-y-4 quality-groups-container"></div><button type="button" class="add-quality-group-to-episode-btn text-sm bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded">+ Add Quality Group to Episode</button>`;
        episodesContainer.appendChild(div);
        const qualityContainer = div.querySelector('.quality-groups-container');
        if (qualityGroups.length > 0) qualityGroups.forEach(group => addQualityGroupField(qualityContainer, group.quality, group.links));
        else addQualityGroupField(qualityContainer);
    };

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

    const handleTypeChange = () => {
        const isSeries = document.querySelector('input[name="type"]:checked').value === 'Web Series';
        seriesDownloadsSection.classList.toggle('hidden', !isSeries);
    };

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.poster-upload-btn')) target.nextElementSibling.click();
        else if (target.matches('#add-screenshot-btn')) addScreenshotField();
        else if (target.matches('#add-quality-group-btn')) addQualityGroupField(movieQualityGroupsContainer);
        else if (target.matches('#add-episode-btn')) addEpisodeField();
        else if (target.matches('.add-link-to-group-btn')) addLinkFieldToGroup(target.previousElementSibling);
        else if (target.matches('.add-quality-group-to-episode-btn')) addQualityGroupField(target.previousElementSibling);
        else if (target.matches('.remove-btn')) target.closest('.quality-group, .episode-field, .screenshot-field, .flex').remove();
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.matches('.poster-upload-input')) {
            handleImageUpload(e.target.files[0], posterUrlInput, posterPreview, e.target.nextElementSibling);
        } else if (e.target.matches('.screenshot-upload-input')) {
            const field = e.target.closest('.screenshot-field');
            handleImageUpload(e.target.files[0], field.querySelector('.screenshot-url-input'), field.querySelector('.screenshot-preview'), field.querySelector('.upload-status'));
        }
    });
    
    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('#poster-url')) {
             posterPreview.src = target.value;
             posterPreview.classList.toggle('hidden', !target.value);
        } else if (target.matches('.screenshot-url-input')) {
            const previewEl = target.closest('.screenshot-field').querySelector('.screenshot-preview');
            previewEl.src = target.value;
            previewEl.classList.toggle('hidden', !target.value);
        }
    });

    document.querySelectorAll('input[name="type"]').forEach(radio => radio.addEventListener('change', handleTypeChange));
    cancelEditBtn.addEventListener('click', resetForm);
    
    movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!posterUrlInput.value) return showToast('Poster URL is required.', true);

        const getQualityGroupsData = (container) => {
            return [...container.querySelectorAll('.quality-group')].map(groupEl => ({
                quality: groupEl.querySelector('.quality-name-input').value.trim(),
                links: [...groupEl.querySelectorAll('.link-list .flex')].map(linkEl => ({
                    size: linkEl.querySelector('.size-input').value.trim(),
                    url: cleanDownloadUrl(linkEl.querySelector('.url-input').value.trim()),
                })).filter(l => l.url)
            })).filter(g => g.quality && g.links.length > 0);
        };
        
        const type = document.querySelector('input[name="type"]:checked').value;
        const movieData = {
            type,
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
            downloadLinks: getQualityGroupsData(movieQualityGroupsContainer),
        };

        if (type === 'Web Series') {
            movieData.episodes = [...episodesContainer.querySelectorAll('.episode-field')].map(epEl => ({
                episodeTitle: epEl.querySelector('.episode-title-input').value.trim(),
                qualityGroups: getQualityGroupsData(epEl.querySelector('.quality-groups-container'))
            })).filter(ep => ep.episodeTitle && ep.qualityGroups.length > 0);
        }
        
        try {
            if (editMode) await updateMovie(movieIdInput.value, movieData);
            else await addMovie(movieData);
            showToast(`Content ${editMode ? 'updated' : 'added'} successfully!`);
            resetForm();
            renderMoviesTable();
        } catch (error) { showToast(`Error saving content: ${error.message}`, true); }
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
                    renderMoviesTable();
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
        } catch (error) { moviesList.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Failed to load content.</td></tr>`;} 
        finally { loadingSpinner.innerHTML = ''; moviesTable.classList.remove('hidden'); }
    };

    genresContainer.innerHTML = ALL_GENRES.map(genre => `<div><input type="checkbox" id="genre-${genre.toLowerCase()}" value="${genre}" class="genre-checkbox"><label for="genre-${genre.toLowerCase()}" class="genre-checkbox-label">${genre}</label></div>`).join('');
    resetForm();
    renderMoviesTable();
});
