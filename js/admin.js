import { getMovies, addMovie, updateMovie, deleteMovie, getMovieById, getMovieRequests, deleteMovieRequest, getAds, addAd, deleteAd, updateAd, getReports, deleteReport } from './db.js';

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

const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           
        .replace(/[^\w\-]+/g, '')       
        .replace(/\-\-+/g, '-')         
        .replace(/^-+/, '')             
        .replace(/-+$/, '');            
};

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        movieForm: document.getElementById('movie-form'),
        moviesList: document.getElementById('movies-list'),
        loadingSpinner: document.getElementById('loading-spinner'),
        moviesTable: document.getElementById('movies-table'),
        formTitle: document.getElementById('form-title'),
        movieIdInput: document.getElementById('movie-id'),
        cancelEditBtn: document.getElementById('cancel-edit-btn'),
        posterUrlInput: document.getElementById('poster-url'),
        posterPreview: document.getElementById('poster-preview'),
        genresContainer: document.getElementById('genres-container'),
        screenshotsContainer: document.getElementById('screenshots-container'),
        seriesDownloadsSection: document.getElementById('series-downloads-section'),
        movieQualityGroupsContainer: document.getElementById('movie-quality-groups-container'),
        episodesContainer: document.getElementById('episodes-container'),
        requestsList: document.getElementById('requests-list'),
        requestsLoadingSpinner: document.getElementById('requests-loading-spinner'),
        promoForm: document.getElementById('promo-form'),
        promosList: document.getElementById('promos-list'),
        promosLoadingSpinner: document.getElementById('promos-loading-spinner'),
        promoIdInput: document.getElementById('promo-id'),
        promoImageUrlInput: document.getElementById('promo-image-url'),
        promoImagePreview: document.getElementById('promo-image-preview'),
        promoCancelBtn: document.getElementById('promo-cancel-btn'),
        reportsList: document.getElementById('reports-list'),
        reportsLoadingSpinner: document.getElementById('reports-loading-spinner'),
        adminSearchInput: document.getElementById('admin-search-input'),
        adminPaginationContainer: document.getElementById('admin-pagination-container'),
        isTrendingCheckbox: document.getElementById('isTrending'),
        urlSlugInput: document.getElementById('url-slug'),
        titleInput: document.getElementById('title'),
    };

    let editMode = false;
    let promoEditMode = false;
    let allMovies = [];

    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transition-all duration-300';
        toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500', 'opacity-100', 'translate-y-0');
        setTimeout(() => toast.classList.add('opacity-0', 'translate-y-full'), 3000);
    };

    const resetForm = () => {
        elements.movieForm.reset();
        document.querySelector('input[name="type"][value="Movie"]').checked = true;
        handleTypeChange();
        elements.movieIdInput.value = '';
        elements.formTitle.textContent = 'Add New Content';
        editMode = false;
        elements.cancelEditBtn.classList.add('hidden');
        elements.posterPreview.classList.add('hidden');
        elements.posterPreview.src = '';
        elements.screenshotsContainer.innerHTML = ''; addScreenshotField();
        elements.movieQualityGroupsContainer.innerHTML = ''; addQualityGroupField(elements.movieQualityGroupsContainer);
        elements.episodesContainer.innerHTML = ''; addEpisodeField();
        elements.urlSlugInput.disabled = false;
        window.scrollTo(0, 0);
    };

    const populateForm = (content) => {
        resetForm();
        elements.formTitle.textContent = `Edit Content: ${content.title}`;
        editMode = true;
        elements.cancelEditBtn.classList.remove('hidden');
        elements.movieIdInput.value = content.id;
        
        ['title', 'year', 'description', 'trailerUrl', 'language', 'quality', 'posterUrl', 'category'].forEach(key => {
            const el = document.getElementById(key);
            if (el && content[key]) el.value = content[key];
        });
        
        elements.urlSlugInput.value = content.id;
        elements.urlSlugInput.disabled = true; // Slugs cannot be changed after creation
        
        elements.isTrendingCheckbox.checked = content.isTrending === true;
        
        document.getElementById('tags').value = content.tags ? content.tags.join(', ') : '';
        if (elements.posterUrlInput.value) { elements.posterPreview.src = elements.posterUrlInput.value; elements.posterPreview.classList.remove('hidden'); }
        
        const selectedType = content.type || 'Movie';
        document.querySelector(`input[name="type"][value="${selectedType}"]`).checked = true;
        handleTypeChange();
        
        document.querySelectorAll('.genre-checkbox').forEach(cb => cb.checked = (content.genres || []).includes(cb.value));
        
        elements.screenshotsContainer.innerHTML = '';
        (content.screenshots || []).forEach(url => addScreenshotField(url));
        if (elements.screenshotsContainer.childElementCount === 0) addScreenshotField();

        elements.movieQualityGroupsContainer.innerHTML = '';
        const isNewFormat = content.downloadLinks && content.downloadLinks.length > 0 && typeof content.downloadLinks[0].links !== 'undefined';
        if (isNewFormat) {
            (content.downloadLinks || []).forEach(group => addQualityGroupField(elements.movieQualityGroupsContainer, group.quality, group.links));
        } else {
            (content.downloadLinks || []).forEach(oldLink => addQualityGroupField(elements.movieQualityGroupsContainer, oldLink.quality, [{ size: oldLink.size, url: oldLink.url }]));
        }
        if (elements.movieQualityGroupsContainer.childElementCount === 0) addQualityGroupField(elements.movieQualityGroupsContainer);
        
        elements.episodesContainer.innerHTML = '';
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
        if (elements.episodesContainer.childElementCount === 0 && selectedType === 'Web Series') addEpisodeField();
        
        window.scrollTo(0, 0);
    };
    
    const addScreenshotField = (url = '') => {
        const fieldId = `ss-upload-${Date.now()}-${Math.random()}`;
        const div = document.createElement('div');
        div.className = 'upload-field screenshot-field';
        div.innerHTML = `<div class="flex items-center justify-between mb-2"><div class="flex items-center gap-4"><label for="${fieldId}" class="cursor-pointer text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded">Upload</label><input type="file" id="${fieldId}" class="screenshot-upload-input hidden" accept="image/*"><span class="upload-status text-xs text-gray-400"></span></div><button type="button" class="remove-btn bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Remove</button></div><input type="url" placeholder="Or paste screenshot URL" value="${url}" class="form-input w-full screenshot-url-input"><img src="${url}" alt="Screenshot Preview" class="screenshot-preview mt-2 rounded ${url ? '' : 'hidden'}" style="max-height: 150px;">`;
        elements.screenshotsContainer.appendChild(div);
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
        elements.episodesContainer.appendChild(div);
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
            if (!response.ok) throw new Error('Network response was not ok.');
            const result = await response.json();
            if (result.success) {
                urlInput.value = result.data.url;
                previewEl.src = result.data.url;
                previewEl.classList.remove('hidden');
                statusEl.textContent = 'Success!';
            } else { throw new Error(result.error.message || 'Unknown ImgBB error'); }
        } catch (error) {
            statusEl.textContent = `Upload failed!`;
            console.error('ImgBB Upload Error:', error);
        }
    };

    const handleTypeChange = () => {
        const isSeries = document.querySelector('input[name="type"]:checked').value === 'Web Series';
        elements.seriesDownloadsSection.classList.toggle('hidden', !isSeries);
    };

    elements.titleInput.addEventListener('input', () => {
        if (!editMode) {
            elements.urlSlugInput.value = slugify(elements.titleInput.value);
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.poster-upload-btn')) target.nextElementSibling.click();
        else if (target.matches('#add-screenshot-btn')) addScreenshotField();
        else if (target.matches('#add-quality-group-btn')) addQualityGroupField(elements.movieQualityGroupsContainer);
        else if (target.matches('#add-episode-btn')) addEpisodeField();
        else if (target.matches('.add-link-to-group-btn')) addLinkFieldToGroup(target.previousElementSibling);
        else if (target.matches('.add-quality-group-to-episode-btn')) addQualityGroupField(target.previousElementSibling);
        else if (target.matches('.remove-btn')) target.closest('.quality-group, .episode-field, .screenshot-field, .flex, .promo-row').remove();
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.matches('.poster-upload-input')) {
            const dropZone = e.target.closest('.upload-field');
            handleImageUpload(e.target.files[0], dropZone.querySelector('.poster-url-input'), dropZone.querySelector('img'), dropZone.querySelector('.upload-status'));
        } else if (e.target.matches('.screenshot-upload-input')) {
            const field = e.target.closest('.screenshot-field');
            handleImageUpload(e.target.files[0], field.querySelector('.screenshot-url-input'), field.querySelector('.screenshot-preview'), field.querySelector('.upload-status'));
        }
    });
    
    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('.poster-url-input')) {
             const dropZone = target.closest('.upload-field');
             const previewEl = dropZone.querySelector('img');
             previewEl.src = target.value;
             previewEl.classList.toggle('hidden', !target.value);
        } else if (target.matches('.screenshot-url-input')) {
            const previewEl = target.closest('.screenshot-field').querySelector('.screenshot-preview');
            previewEl.src = target.value;
            previewEl.classList.toggle('hidden', !target.value);
        }
    });

    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, (e) => {
            const dropZone = e.target.closest('.upload-field');
            if (!dropZone) return;
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') dropZone.classList.add('drag-over');
            else dropZone.classList.remove('drag-over');
            if (eventName === 'drop') {
                const file = e.dataTransfer.files[0];
                const urlInput = dropZone.querySelector('.poster-url-input');
                const previewEl = dropZone.querySelector('img');
                const statusEl = dropZone.querySelector('.upload-status');
                if (file && urlInput && previewEl && statusEl) handleImageUpload(file, urlInput, previewEl, statusEl);
            }
        });
    });

    document.querySelectorAll('input[name="type"]').forEach(radio => radio.addEventListener('change', handleTypeChange));
    elements.cancelEditBtn.addEventListener('click', resetForm);
    
    elements.movieForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const movieSlug = elements.urlSlugInput.value.trim();
        if (!elements.posterUrlInput.value) return showToast('Poster URL is required.', true);
        if (!movieSlug) return showToast('URL Slug is required.', true);

        const getQualityGroupsData = (container) => [...container.querySelectorAll('.quality-group')].map(groupEl => ({quality: groupEl.querySelector('.quality-name-input').value.trim(), links: [...groupEl.querySelectorAll('.link-list .flex')].map(linkEl => ({size: linkEl.querySelector('.size-input').value.trim(), url: cleanDownloadUrl(linkEl.querySelector('.url-input').value.trim())})).filter(l => l.url)})).filter(g => g.quality && g.links.length > 0);
        const type = document.querySelector('input[name="type"]:checked').value;
        const movieData = {type, title: document.getElementById('title').value, year: Number(document.getElementById('year').value), description: document.getElementById('description').value, posterUrl: elements.posterUrlInput.value, trailerUrl: document.getElementById('trailer-url').value, language: document.getElementById('language').value, category: document.getElementById('category').value, quality: document.getElementById('quality').value.trim(), genres: [...document.querySelectorAll('.genre-checkbox:checked')].map(cb => cb.value), tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean), screenshots: [...elements.screenshotsContainer.querySelectorAll('.screenshot-url-input')].map(input => input.value.trim()).filter(Boolean), downloadLinks: getQualityGroupsData(elements.movieQualityGroupsContainer), isTrending: elements.isTrendingCheckbox.checked };
        if (type === 'Web Series') movieData.episodes = [...elements.episodesContainer.querySelectorAll('.episode-field')].map(epEl => ({episodeTitle: epEl.querySelector('.episode-title-input').value.trim(), qualityGroups: getQualityGroupsData(epEl.querySelector('.quality-groups-container'))})).filter(ep => ep.episodeTitle && ep.qualityGroups.length > 0);
        
        try {
            if (editMode) {
                await updateMovie(elements.movieIdInput.value, movieData);
            } else {
                await addMovie(movieSlug, movieData);
            }
            showToast(`Content ${editMode ? 'updated' : 'added'} successfully!`);
            resetForm();
            initialLoad();
        } catch (error) { showToast(`Error saving content: ${error.message}`, true); }
    });
    
    elements.moviesList.addEventListener('click', async (e) => {
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
                    initialLoad();
                } catch (error) { showToast(`Error: ${error.message}`, true); }
            }
        }
    });

    const renderMoviesTable = (page = 1, searchTerm = '') => {
        const filteredMovies = allMovies.filter(movie => movie.title.toLowerCase().includes(searchTerm.toLowerCase()));
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = filteredMovies.slice(startIndex, endIndex);
        elements.moviesList.innerHTML = paginatedItems.map(movie => `<tr class="border-b border-gray-700 hover:bg-gray-900"><td class="p-3"><img src="${movie.posterUrl}" alt="${movie.title}" class="h-16 w-auto rounded object-cover"></td><td class="p-3 font-semibold">${movie.isTrending ? '🔥 ' : ''}${movie.title}</td><td class="p-3">${movie.year}</td><td class="p-3"><span class="text-xs font-bold ${movie.type === 'Web Series' ? 'text-green-400' : 'text-cyan-400'}">${movie.type || 'Movie'}</span></td><td class="p-3"><button data-id="${movie.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded mr-2">Edit</button><button data-id="${movie.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded">Delete</button></td></tr>`).join('');
        elements.loadingSpinner.innerHTML = '';
        elements.moviesTable.classList.remove('hidden');
        renderAdminPagination(totalPages, page);
    };

    const renderAdminPagination = (totalPages, currentPage) => {
        if (totalPages <= 1) {
            elements.adminPaginationContainer.innerHTML = '';
            return;
        }
        let buttons = '';
        buttons += `<button data-page="${currentPage - 1}" class="admin-page-link ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">Prev</button>`;
        buttons += `<span class="px-3 py-2 text-gray-400">Page ${currentPage} of ${totalPages}</span>`;
        buttons += `<button data-page="${currentPage + 1}" class="admin-page-link ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">Next</button>`;
        elements.adminPaginationContainer.innerHTML = buttons;
    };
    
    elements.adminPaginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('admin-page-link')) {
            const page = parseInt(e.target.dataset.page);
            renderMoviesTable(page, elements.adminSearchInput.value);
        }
    });

    elements.adminSearchInput.addEventListener('input', () => {
        renderMoviesTable(1, elements.adminSearchInput.value);
    });

    const initialLoad = async () => {
        elements.loadingSpinner.innerHTML = `<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>`;
        try {
            allMovies = await getMovies();
            allMovies.sort((a,b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
            renderMoviesTable(1);
        } catch (error) { 
            console.error("Failed to load content for admin panel:", error);
            elements.loadingSpinner.innerHTML = `<p class="text-red-500">Failed to load content.</p>`;
        }
    };
    
    const resetPromoForm = () => {
        elements.promoForm.reset();
        elements.promoIdInput.value = '';
        elements.promoImagePreview.src = '';
        elements.promoImagePreview.classList.add('hidden');
        elements.promoForm.querySelector('button[type="submit"]').textContent = 'Save Promo';
        if (elements.promoCancelBtn) elements.promoCancelBtn.classList.add('hidden');
        promoEditMode = false;
    };

    const renderPromos = async () => {
        elements.promosLoadingSpinner.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>`;
        elements.promosList.innerHTML = '';
        try {
            const promos = await getAds();
            if (promos.length === 0) {
                elements.promosList.innerHTML = `<p class="text-gray-500 text-center">No promos created yet.</p>`;
            } else {
                elements.promosList.innerHTML = promos.map(promo => {
                    const isVisible = promo.visible !== false;
                    return `<div class="promo-row flex items-center justify-between gap-4"><img src="${promo.imageUrl}" class="h-12 w-24 object-contain rounded bg-gray-700"><div class="flex-1"><p class="text-sm text-white">${promo.location}</p><p class="text-xs text-gray-400 truncate">${promo.targetUrl}</p></div><div class="flex items-center gap-4"><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" data-id="${promo.id}" class="sr-only peer promo-visibility-toggle" ${isVisible ? 'checked' : ''}><div class="w-11 h-6 bg-gray-600 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div></label><button data-id="${promo.id}" class="promo-delete-btn bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded">Delete</button></div></div>`}).join('');
            }
        } catch (error) {
            elements.promosList.innerHTML = `<p class="text-red-500 text-center">Failed to load promos.</p>`;
        } finally {
            elements.promosLoadingSpinner.innerHTML = '';
        }
    };
    
    if(elements.promoForm) {
        elements.promoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const promoData = {
                imageUrl: elements.promoImageUrlInput.value,
                targetUrl: document.getElementById('promo-target-url').value,
                location: document.getElementById('promo-location').value,
                visible: true
            };
            if (!promoData.imageUrl || !promoData.targetUrl) return showToast('Promo Image and Target URL are required.', true);
            try {
                await addAd(promoData);
                showToast('Promo added successfully!');
                resetPromoForm();
                renderPromos();
            } catch (error) { showToast(`Error adding promo: ${error.message}`, true); }
        });
    }

    if(elements.promosList) {
        elements.promosList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('promo-delete-btn')) {
                if (confirm('Are you sure you want to delete this promo?')) {
                    try {
                        await deleteAd(e.target.dataset.id);
                        showToast('Promo deleted!');
                        renderPromos();
                    } catch (error) { showToast(`Error deleting promo: ${error.message}`, true); }
                }
            }
        });
        elements.promosList.addEventListener('change', async (e) => {
            if (e.target.classList.contains('promo-visibility-toggle')) {
                const promoId = e.target.dataset.id;
                const newVisibility = e.target.checked;
                try {
                    await updateAd(promoId, { visible: newVisibility });
                    showToast(`Promo status updated to ${newVisibility ? 'Visible' : 'Hidden'}.`);
                } catch (error) {
                    showToast(`Error updating status: ${error.message}`, true);
                    e.target.checked = !newVisibility;
                }
            }
        });
    }
    
    const renderMovieRequests = async () => {
        elements.requestsLoadingSpinner.innerHTML = `<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>`;
        elements.requestsList.innerHTML = '';
        try {
            const requests = await getMovieRequests();
            if (requests.length === 0) {
                elements.requestsList.innerHTML = `<p class="text-gray-500 text-center">No pending movie requests.</p>`;
            } else {
                elements.requestsList.innerHTML = requests.map(req => `<div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between gap-4"><div><p class="font-bold text-white">${req.title}</p><p class="text-sm text-gray-400">${req.notes || 'No notes provided.'}</p><p class="text-xs text-cyan-400 mt-2">By: ${req.userName || 'Anonymous'}</p></div><button data-id="${req.id}" class="mark-done-btn bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded">Done</button></div>`).join('');
            }
        } catch (error) {
            elements.requestsList.innerHTML = `<p class="text-red-500 text-center">Failed to load requests.</p>`;
        } finally {
            elements.requestsLoadingSpinner.innerHTML = '';
        }
    };

    if(elements.requestsList) {
        elements.requestsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('mark-done-btn')) {
                const requestId = e.target.dataset.id;
                e.target.disabled = true;
                e.target.textContent = '...';
                try {
                    await deleteMovieRequest(requestId);
                    showToast('Request marked as done!');
                    renderMovieRequests();
                } catch (err) {
                    showToast('Failed to remove request.', true);
                    e.target.disabled = false;
                    e.target.textContent = 'Done';
                }
            }
        });
    }

    const renderReports = async () => {
        elements.reportsLoadingSpinner.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>`;
        elements.reportsList.innerHTML = '';
        try {
            const reports = await getReports();
            if (reports.length === 0) {
                elements.reportsList.innerHTML = `<p class="text-gray-500 text-center">No pending link reports. Great job!</p>`;
            } else {
                elements.reportsList.innerHTML = reports.map(report => `<div class="bg-gray-800 p-4 rounded-lg"><div class="flex items-center justify-between gap-4"><div><p class="font-bold text-white">${report.movieTitle}</p><p class="text-sm text-yellow-400">Quality: ${report.quality}</p><p class="text-xs text-gray-400 break-all">URL: ${report.brokenUrl}</p></div><button data-id="${report.id}" class="mark-report-done-btn bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded">Resolved</button></div></div>`).join('');
            }
        } catch (error) {
            elements.reportsList.innerHTML = `<p class="text-red-500 text-center">Failed to load reports.</p>`;
        } finally {
            elements.reportsLoadingSpinner.innerHTML = '';
        }
    };

    if(elements.reportsList) {
        elements.reportsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('mark-report-done-btn')) {
                const reportId = e.target.dataset.id;
                e.target.disabled = true;
                try {
                    await deleteReport(reportId);
                    showToast('Report marked as resolved!');
                    renderReports();
                } catch (err) {
                    showToast('Failed to remove report.', true);
                    e.target.disabled = false;
                }
            }
        });
    }

    elements.genresContainer.innerHTML = ALL_GENRES.map(genre => `<div><input type="checkbox" id="genre-${genre.toLowerCase()}" value="${genre}" class="genre-checkbox"><label for="genre-${genre.toLowerCase()}" class="genre-checkbox-label">${genre}</label></div>`).join('');
    resetForm();
    initialLoad();
    renderMovieRequests();
    renderPromos();
    renderReports();
});
