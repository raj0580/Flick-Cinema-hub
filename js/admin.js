import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById, getMovieRequests, deleteMovieRequest } from './db.js';

const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';
const ALL_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'];

const cleanDownloadUrl = (rawUrl) => { /* ... (This function is unchanged) ... */ };

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
    const seriesDownloadsSection = document.getElementById('series-downloads-section');
    const movieQualityGroupsContainer = document.getElementById('movie-quality-groups-container');
    const episodesContainer = document.getElementById('episodes-container');
    const requestsList = document.getElementById('requests-list');
    const requestsLoadingSpinner = document.getElementById('requests-loading-spinner');
    
    let editMode = false;

    const showToast = (message, isError = false) => { /* ... (unchanged) ... */ };
    const resetForm = () => { /* ... (unchanged) ... */ };
    
    const populateForm = (content) => {
        resetForm();
        formTitle.textContent = `Edit Content: ${content.title}`;
        editMode = true;
        cancelEditBtn.classList.remove('hidden');
        movieIdInput.value = content.id;
        
        // --- THIS IS THE CRITICAL CHANGE FOR BACKWARD COMPATIBILITY ---
        ['title', 'year', 'description', 'trailerUrl', 'language', 'quality', 'posterUrl', 'category'].forEach(key => {
            const el = document.getElementById(key);
            if (el && content[key]) {
                el.value = content[key];
            }
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

        movieQualityGroupsContainer.innerHTML = '';
        const isNewFormat = content.downloadLinks && content.downloadLinks.length > 0 && typeof content.downloadLinks[0].links !== 'undefined';
        if (isNewFormat) {
            (content.downloadLinks || []).forEach(group => addQualityGroupField(movieQualityGroupsContainer, group.quality, group.links));
        } else {
            (content.downloadLinks || []).forEach(oldLink => addQualityGroupField(movieQualityGroupsContainer, oldLink.quality, [{ size: oldLink.size, url: oldLink.url }]));
        }
        if (movieQualityGroupsContainer.childElementCount === 0) addQualityGroupField(movieQualityGroupsContainer);
        
        episodesContainer.innerHTML = '';
        if (selectedType === 'Web Series' && content.episodes) {
            content.episodes.forEach(ep => {
                const isNewEpisodeFormat = ep.qualityGroups && ep.qualityGroups.length > 0 && typeof ep.qualityGroups[0].links !== 'undefined';
                let qualityGroupsForUI = [];
                if (isNewEpisodeFormat) {
                    qualityGroupsForUI = ep.qualityGroups;
                } else if (ep.downloadLinks) {
                    const qualityMap = {};
                    ep.downloadLinks.forEach(oldLink => { if (!qualityMap[oldLink.quality]) qualityMap[oldLink.quality] = []; qualityMap[oldLink.quality].push({ size: oldLink.size, url: oldLink.url }); });
                    qualityGroupsForUI = Object.keys(qualityMap).map(quality => ({ quality, links: qualityMap[quality] }));
                }
                addEpisodeField(ep.episodeTitle, qualityGroupsForUI);
            });
        }
        if (episodesContainer.childElementCount === 0 && selectedType === 'Web Series') addEpisodeField();
        
        window.scrollTo(0, 0);
    };
    
    // The rest of the functions (addScreenshotField, addQualityGroupField, etc.) are unchanged and correct.
    const addScreenshotField = (url = '') => { /* ... */ };
    const addQualityGroupField = (parentContainer, quality = '', links = []) => { /* ... */ };
    const addLinkFieldToGroup = (linkList, size = '', url = '') => { /* ... */ };
    const addEpisodeField = (title = '', qualityGroups = []) => { /* ... */ };
    const handleImageUpload = async (file, urlInput, previewEl, statusEl) => { /* ... */ };
    const handleTypeChange = () => { /* ... */ };
    document.body.addEventListener('click', (e) => { /* ... */ });
    document.body.addEventListener('change', (e) => { /* ... */ });
    document.body.addEventListener('input', (e) => { /* ... */ });
    document.querySelectorAll('input[name="type"]').forEach(radio => radio.addEventListener('change', handleTypeChange));
    cancelEditBtn.addEventListener('click', resetForm);
    
    movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!posterUrlInput.value) return showToast('Poster URL is required.', true);
        const getQualityGroupsData = (container) => { /* ... (unchanged) ... */ };
        
        const type = document.querySelector('input[name="type"]:checked').value;
        const movieData = {
            type,
            title: document.getElementById('title').value,
            year: Number(document.getElementById('year').value),
            description: document.getElementById('description').value,
            posterUrl: posterUrlInput.value,
            trailerUrl: document.getElementById('trailer-url').value,
            language: document.getElementById('language').value, // This is still saved
            category: document.getElementById('category').value, // The new category is also saved
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
    
    moviesList.addEventListener('click', async (e) => { /* ... (unchanged) ... */ });
    const renderMoviesTable = async () => { /* ... (unchanged) ... */ };
    const renderMovieRequests = async () => { /* ... (unchanged) ... */ };
    requestsList.addEventListener('click', async (e) => { /* ... (unchanged) ... */ });

    genresContainer.innerHTML = ALL_GENRES.map(genre => `<div><input type="checkbox" id="genre-${genre.toLowerCase()}" value="${genre}" class="genre-checkbox"><label for="genre-${genre.toLowerCase()}" class="genre-checkbox-label">${genre}</label></div>`).join('');
    resetForm();
    renderMoviesTable();
    renderMovieRequests();
});
