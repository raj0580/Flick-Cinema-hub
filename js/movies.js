import { getMovies, getMovieById, addMovieRequest, getAds } from './db.js';

const initializeMoviePageSearch = () => {
    const observer = new MutationObserver((mutations, obs) => {
        const searchIconBtn = document.getElementById('search-icon-btn');
        if (searchIconBtn) {
            const searchBarContainer = document.getElementById('search-bar-container');
            let isSearchVisible = false;
            const showSearchBar = () => {
                searchBarContainer.innerHTML = `<div id="movie-page-search-bar" class="fixed top-[-100px] left-0 right-0 bg-gray-900/90 backdrop-blur-sm p-4 z-30 shadow-lg"><div class="container mx-auto"><form id="movie-page-search-form" class="flex gap-2"><input type="search" id="movie-page-search-input" class="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600" placeholder="Search for another movie..."><button type="submit" class="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">Search</button></form></div></div>`;
                setTimeout(() => {
                    const searchBar = document.getElementById('movie-page-search-bar');
                    if (searchBar) searchBar.style.top = '68px';
                }, 10);
                document.getElementById('movie-page-search-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const searchTerm = document.getElementById('movie-page-search-input').value;
                    if (searchTerm) window.location.href = `/?search=${encodeURIComponent(searchTerm)}`;
                });
                isSearchVisible = true;
            };
            const hideSearchBar = () => {
                const searchBar = document.getElementById('movie-page-search-bar');
                if (searchBar) {
                    searchBar.style.top = '-100px';
                    setTimeout(() => { searchBarContainer.innerHTML = ''; }, 300);
                }
                isSearchVisible = false;
            };
            searchIconBtn.addEventListener('click', () => {
                if (isSearchVisible) hideSearchBar();
                else showSearchBar();
            });
            obs.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
};

const renderMovieCard = (movie) => {
    const tagsHtml = `<div class="absolute top-2 right-2 flex flex-wrap justify-end gap-2">${movie.type === 'Web Series' ? `<span class="bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-md">SERIES</span>` : ''}${movie.quality ? `<span class="bg-cyan-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-md">${movie.quality}</span>` : ''}</div>`;
    const trendingIcon = movie.isTrending ? `<div class="absolute bottom-2 left-2 text-yellow-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></div>` : '';
    return `<a href="/movie/${movie.id}" class="group block bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-shadow duration-300"><div class="relative"><img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-auto aspect-[2/3] object-cover transform group-hover:scale-105 transition-transform duration-300">${tagsHtml}${trendingIcon}</div><div class="p-3"><h3 class="text-md font-bold truncate group-hover:text-cyan-400">${movie.title}</h3><div class="text-xs text-gray-400 mt-1"><span>${movie.year}</span> •<span class="truncate">${(movie.genres || []).join(', ')}</span></div></div></a>`;
};

const renderAds = async () => {
    try {
        const allAds = await getAds();
        const visibleAds = allAds.filter(ad => ad.visible === true);
        const adSlots = {};
        visibleAds.forEach(ad => {
            if (!adSlots[ad.location]) adSlots[ad.location] = [];
            adSlots[ad.location].push(ad);
        });
        for (const location in adSlots) {
            const container = document.getElementById(`promo-${location}`) || (location === 'sidebar' ? document.getElementById('promo-sidebar-content') : null);
            if (container) {
                const adsForSlot = adSlots[location];
                if (adsForSlot.length > 0) {
                    container.innerHTML = adsForSlot.map((ad, index) => `<a href="${ad.targetUrl}" target="_blank" rel="noopener sponsored" class="promo-slide" style="display: ${index === 0 ? 'block' : 'none'}"><img src="${ad.imageUrl}" alt="Advertisement" class="rounded-lg shadow-md"></a>`).join('');
                    if (adsForSlot.length > 1) {
                        let currentAdIndex = 0;
                        setInterval(() => {
                            const slides = container.querySelectorAll('.promo-slide');
                            if(slides.length > 0) {
                                slides[currentAdIndex].style.display = 'none';
                                currentAdIndex = (currentAdIndex + 1) % slides.length;
                                slides[currentAdIndex].style.display = 'block';
                            }
                        }, 10000);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Failed to load promos:", error);
    }
};

const renderHomepage = async (initialSearchTerm = '') => {
    renderAds();
    const movieGrid = document.getElementById('movie-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResultsSection = document.getElementById('no-results-section');
    const searchInput = document.getElementById('search-input');
    const paginationContainer = document.getElementById('pagination-container');
    let allMovies = [];
    const getItemsPerPage = () => window.innerWidth < 768 ? 10 : 20;
    let itemsPerPage = getItemsPerPage();
    window.addEventListener('resize', () => {
        itemsPerPage = getItemsPerPage();
        filterAndDisplay(); 
    });

    const createPaginationControls = (totalPages, currentPage) => {
        if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
        let buttons = '';
        const maxButtons = 5;
        buttons += `<a href="?page=${currentPage - 1}" class="page-link ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">Prev</a>`;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons) { startPage = Math.max(1, endPage - maxButtons + 1); }
        if (startPage > 1) {
            buttons += `<a href="?page=1" class="page-link px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">1</a>`;
            if (startPage > 2) buttons += `<span class="px-3 py-2 text-gray-400">...</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            buttons += `<a href="?page=${i}" class="page-link ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-700'} px-3 py-2 rounded-md hover:bg-cyan-500">${i}</a>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons += `<span class="px-3 py-2 text-gray-400">...</span>`;
            buttons += `<a href="?page=${totalPages}" class="page-link px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">${totalPages}</a>`;
        }
        buttons += `<a href="?page=${currentPage + 1}" class="page-link ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} px-3 py-2 bg-gray-700 rounded-md hover:bg-cyan-500">Next</a>`;
        paginationContainer.innerHTML = buttons;
    };

    const displayMovies = (moviesToDisplay, page = 1) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = moviesToDisplay.slice(startIndex, endIndex);
        movieGrid.innerHTML = paginatedItems.map(renderMovieCard).join('');
        if (moviesToDisplay.length === 0) {
            noResultsSection.style.display = 'block';
            paginationContainer.innerHTML = '';
            document.getElementById('request-title').value = searchInput.value;
        } else {
            noResultsSection.style.display = 'none';
            const totalPages = Math.ceil(moviesToDisplay.length / itemsPerPage);
            createPaginationControls(totalPages, page);
        }
    };

    const filterAndDisplay = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page')) || 1;
        const searchTerm = searchInput.value.toLowerCase();
        const selectedGenre = document.getElementById('genre-filter').value;
        const selectedYear = document.getElementById('year-filter').value;
        const selectedCategory = document.getElementById('category-filter').value;
        let filtered = allMovies.filter(movie => ((movie.genres || []).includes(selectedGenre) || !selectedGenre) && movie.title.toLowerCase().includes(searchTerm) && (!selectedYear || movie.year == selectedYear) && (!selectedCategory || movie.category === selectedCategory));
        filtered.sort((a, b) => {
            const aIsTrending = a.isTrending === true;
            const bIsTrending = b.isTrending === true;
            if (aIsTrending && !bIsTrending) return -1;
            if (!aIsTrending && bIsTrending) return 1;
            return b.year - a.year;
        });
        displayMovies(filtered, currentPage);
    };

    try {
        allMovies = await getMovies();
        loadingSpinner.style.display = 'none';
        const populateFilters = (movies) => {
            const genres = [...new Set(movies.flatMap(m => m.genres || []))].sort();
            const years = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);
            const categories = [...new Set(movies.map(m => m.category).filter(Boolean))].sort();
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const categoryFilter = document.getElementById('category-filter');
            genres.forEach(g => genreFilter.innerHTML += `<option value="${g}">${g}</option>`);
            years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);
            categories.forEach(c => categoryFilter.innerHTML += `<option value="${c}">${c}</option>`);
        };
        
        if (allMovies.length > 0) {
            populateFilters(allMovies);
            if (initialSearchTerm) searchInput.value = initialSearchTerm;
            filterAndDisplay();
        } else {
            displayMovies([]);
        }
        
        ['search-input', 'genre-filter', 'year-filter', 'category-filter'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                const url = new URL(window.location);
                url.searchParams.set('page', '1');
                history.pushState({}, '', url);
                filterAndDisplay();
            });
        });

        paginationContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.classList.contains('page-link')) {
                e.preventDefault();
                const url = new URL(e.target.href);
                const page = url.searchParams.get('page');
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('page', page);
                history.pushState({}, '', currentUrl);
                filterAndDisplay();
                window.scrollTo(0, 0);
            }
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
    const savedUserName = localStorage.getItem('flickCinemaUserName');
    if (!savedUserName) {
        userDetailsSection.classList.remove('hidden');
        nameInput.required = true;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('request-submit-btn');
        const messageDiv = document.getElementById('request-message');
        const title = document.getElementById('request-title').value.trim();
        const notes = document.getElementById('request-notes').value.trim();
        let userName = savedUserName || nameInput.value.trim();
        if (!title || !userName) {
            messageDiv.textContent = "Please fill out all required fields.";
            messageDiv.className = "mt-4 text-red-400";
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        try {
            await addMovieRequest({ title, notes, userName, requestedAt: new Date() });
            if (!savedUserName) {
                localStorage.setItem('flickCinemaUserName', userName);
                userDetailsSection.classList.add('hidden');
            }
            messageDiv.textContent = "Thank you! Your request has been sent.";
            messageDiv.className = "mt-4 text-green-400";
            document.getElementById('request-title').value = '';
            document.getElementById('request-notes').value = '';
        } catch (err) {
            messageDiv.textContent = "Something went wrong. Please try again.";
            messageDiv.className = "mt-4 text-red-400";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";
        }
    });
};

const renderRecommendations = async (currentMovie) => {
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendationsGrid = document.getElementById('recommendations-grid');
    if (!recommendationsSection || !recommendationsGrid) return;
    const allMovies = await getMovies();
    const recommended = [];
    if (currentMovie.category) {
        const byCategory = allMovies.filter(m => m.id !== currentMovie.id && m.category === currentMovie.category);
        recommended.push(...byCategory);
    }
    if (currentMovie.genres && currentMovie.genres.length > 0) {
        const byGenre = allMovies.filter(m => {
            if (m.id === currentMovie.id || recommended.some(rec => rec.id === m.id)) return false;
            return (m.genres || []).some(genre => currentMovie.genres.includes(genre));
        });
        recommended.push(...byGenre);
    }
    const uniqueRecommended = [...new Map(recommended.map(item => [item.id, item])).values()];
    const shuffled = uniqueRecommended.sort(() => 0.5 - Math.random());
    const finalRecommendations = shuffled.slice(0, 5);
    if (finalRecommendations.length > 0) {
        recommendationsGrid.innerHTML = finalRecommendations.map(renderMovieCard).join('');
        recommendationsSection.classList.remove('hidden');
    }
};

const renderMovieDetailPage = async () => {
    renderAds();
    const pathSegments = window.location.pathname.split('/');
    const movieId = pathSegments[pathSegments.length - 1];
    if (!movieId || movieId === 'movie.html') {
        window.location.href = '/';
        return;
    }

    const loadingSpinner = document.getElementById('loading-spinner');
    const movieContent = document.getElementById('movie-content');
    const errorMessage = document.getElementById('error-message');

    try {
        const movie = await getMovieById(movieId);
        loadingSpinner.style.display = 'none';
        if (!movie) return errorMessage.style.display = 'block';
        
        const pageTitle = `${movie.title} (${movie.year}) - Flick Cinema`;
        const pageDescription = `Download ${movie.title} (${movie.year}) in high quality. Category: ${movie.category}. Language: ${movie.language}.`;
        const pageUrl = window.location.href;
        document.title = pageTitle;
        
        document.getElementById('movie-poster').src = movie.posterUrl;
        document.getElementById('movie-title').textContent = movie.title || '';
        document.getElementById('movie-type').textContent = movie.type || 'Movie';
        document.getElementById('movie-description').textContent = movie.description || '';
        
        const detailsContainer = document.getElementById('extra-details-container');
        let detailsHtml = '';
        if (movie.year) detailsHtml += `<div><strong>Year:</strong> <span class="text-gray-200">${movie.year}</span></div>`;
        if (movie.category) detailsHtml += `<div><strong>Category:</strong> <span class="text-gray-200">${movie.category}</span></div>`;
        if (movie.language) detailsHtml += `<div><strong>Language:</strong> <span class="text-gray-200">${movie.language}</span></div>`;
        detailsContainer.innerHTML = detailsHtml;

        document.getElementById('movie-genres').innerHTML = (movie.genres || []).map(g => `<span class="bg-gray-700 text-cyan-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">${g}</span>`).join('');
        document.getElementById('movie-tags').innerHTML = (movie.tags || []).map(t => `<span class="bg-gray-600 text-gray-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${t}</span>`).join('');
        
        const trailerContainer = document.getElementById('trailer-container');
        if (movie.trailerUrl) {
            const videoId = movie.trailerUrl.split('v=')[1]?.split('&')[0] || movie.trailerUrl.split('/').pop();
            trailerContainer.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        }
        
        document.getElementById('screenshots-grid').innerHTML = (movie.screenshots || []).map(url => `<a href="${url}" target="_blank"><img src="${url}" class="w-full h-auto rounded-lg object-cover" alt="Screenshot"></a>`).join('');

        const downloadBtn = document.getElementById('get-download-links-btn');
        if (downloadBtn) {
            downloadBtn.href = `/download/${movieId}`;
        }

        movieContent.style.display = 'block';
        renderRecommendations(movie);
    } catch (error) {
        console.error("Error loading movie details:", error);
        if(loadingSpinner) loadingSpinner.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'block';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html') || path.includes('?search=') || path.includes('?page=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');
        renderHomepage(searchTerm);
        handleRequestForm();
    } else if (path.includes('/movie/')) {
        renderMovieDetailPage();
        initializeMoviePageSearch();
    }
});
