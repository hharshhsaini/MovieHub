/* ========================================
   MOVIEHUB - TMDB API Integration
   With Hover-to-Play Trailers
======================================== */

// ========================================
// API CONFIGURATION
// ========================================
// TMDB API - for movies list and trailers
const TMDB_API_KEY = '6bcf8e0a0a5ae5674041bd1b7296caf6';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

// OMDB API - for detailed movie information
const OMDB_API_KEY = '86bf3871';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

// ========================================
// APP STATE
// ========================================
const state = {
    query: '',
    currentPage: 1,
    totalPages: 1,
    movies: [],
    currentGenre: 'all',
    currentSort: 'relevance',
    favorites: [],
    showingFavorites: false
};

// Cache for video keys (lazy loaded on hover)
const videoCache = new Map();

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    searchInput: document.getElementById('searchInput'),
    movieGrid: document.getElementById('movieGrid'),
    emptyState: document.getElementById('emptyState'),
    loading: document.getElementById('loading'),
    pagination: document.getElementById('pagination'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageInfo: document.getElementById('pageInfo'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalContent: document.getElementById('modalContent'),
    modalClose: document.getElementById('modalClose'),
    sortSelect: document.getElementById('sortSelect'),
    resultsTitle: document.getElementById('resultsTitle'),
    fabFavorites: document.getElementById('fabFavorites'),
    favCount: document.getElementById('favCount'),
    backBtn: document.getElementById('backBtn'),
    posterGrid: document.getElementById('posterGrid')
};

// Placeholder for missing posters
const PLACEHOLDER_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect fill='%230f1720' width='300' height='450'/%3E%3Ctext x='150' y='200' text-anchor='middle' fill='%23ff9000' font-family='system-ui' font-size='48'%3E🎬%3C/text%3E%3Ctext x='150' y='260' text-anchor='middle' fill='%23666' font-family='system-ui' font-size='14'%3ENo Poster%3C/text%3E%3C/svg%3E`;

// Genre mapping for TMDB
const GENRE_IDS = {
    'all': null,
    'crime': 80,
    'sci-fi': 878,
    'comedy': 35,
    'adventure': 12
};

let isLoading = false;

// ========================================
// TMDB API FUNCTIONS
// ========================================

/**
 * Fetch popular movies from TMDB
 */
async function fetchPopularMovies(page = 1) {
    const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        return { results: [], total_pages: 0 };
    }
}

/**
 * Fetch movies by genre from TMDB
 */
async function fetchMoviesByGenre(genreId, page = 1) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&with_genres=${genreId}&page=${page}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching movies by genre:', error);
        return { results: [], total_pages: 0 };
    }
}

/**
 * Search movies on TMDB
 */
async function searchMovies(query, page = 1) {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error searching movies:', error);
        return { results: [], total_pages: 0 };
    }
}

/**
 * Fetch movie details from TMDB
 */
async function fetchMovieDetails(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

/**
 * Fetch movie trailer/videos from TMDB (lazy loaded on hover)
 * Returns YouTube video key or null
 */
async function fetchMovieTrailer(movieId) {
    // Check cache first
    if (videoCache.has(movieId)) {
        return videoCache.get(movieId);
    }
    
    const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Prefer official trailer from YouTube
            let trailer = data.results.find(v => 
                v.site === 'YouTube' && v.type === 'Trailer'
            );
            
            // Fallback to any YouTube video
            if (!trailer) {
                trailer = data.results.find(v => v.site === 'YouTube');
            }
            
            const videoKey = trailer ? trailer.key : null;
            videoCache.set(movieId, videoKey);
            return videoKey;
        }
        
        videoCache.set(movieId, null);
        return null;
    } catch (error) {
        console.error('Error fetching trailer:', error);
        videoCache.set(movieId, null);
        return null;
    }
}

/**
 * Fetch detailed movie info from OMDB API using IMDB ID
 * Returns rich movie data: plot, awards, ratings, box office, etc.
 */
async function fetchOMDBDetails(imdbId) {
    if (!imdbId) return null;
    
    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.Response === 'True') {
            return data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching OMDB details:', error);
        return null;
    }
}

/**
 * Search OMDB by title to get IMDB ID
 */
async function searchOMDBByTitle(title, year) {
    const yearParam = year ? `&y=${year}` : '';
    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}${yearParam}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.Response === 'True') {
            return data;
        }
        return null;
    } catch (error) {
        console.error('Error searching OMDB:', error);
        return null;
    }
}

// ========================================
// HERO BACKGROUND
// ========================================
async function initHeroBackground() {
    try {
        const data = await fetchPopularMovies(1);
        const movies = data.results.filter(m => m.poster_path).slice(0, 18);
        
        if (movies.length === 0 || !elements.posterGrid) return;
        
        let posterHTML = '';
        for (let i = 0; i < 18; i++) {
            const movie = movies[i % movies.length];
            const posterUrl = `${TMDB_IMAGE_BASE}${movie.poster_path}`;
            posterHTML += `<img src="${posterUrl}" alt="" aria-hidden="true">`;
        }
        
        elements.posterGrid.innerHTML = posterHTML;
    } catch (error) {
        console.error('Error loading hero background:', error);
    }
}

// ========================================
// FAVORITES (IndexedDB)
// ========================================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MovieHubDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('favorites')) {
                db.createObjectStore('favorites', { keyPath: 'id' });
            }
        };
    });
}

async function getFavorites() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favorites', 'readonly');
        const store = tx.objectStore('favorites');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addFavorite(movie) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favorites', 'readwrite');
        tx.objectStore('favorites').put(movie);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function removeFavorite(movieId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favorites', 'readwrite');
        tx.objectStore('favorites').delete(movieId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function isFavorite(movieId) {
    const favorites = await getFavorites();
    return favorites.some(f => f.id === movieId);
}

async function updateFavCount() {
    const favorites = await getFavorites();
    state.favorites = favorites;
    if (elements.favCount) {
        elements.favCount.textContent = favorites.length;
    }
}


// ========================================
// RENDER MOVIE CARDS WITH HOVER TRAILER
// ========================================
async function renderMovies(movies) {
    if (!movies || movies.length === 0) {
        elements.movieGrid.innerHTML = '';
        elements.emptyState.hidden = false;
        elements.pagination.hidden = true;
        return;
    }
    
    elements.emptyState.hidden = true;
    
    const favorites = await getFavorites();
    const favIds = new Set(favorites.map(f => f.id));
    
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const isFav = favIds.has(movie.id);
        const posterUrl = movie.poster_path 
            ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
            : PLACEHOLDER_POSTER;
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        const card = document.createElement('article');
        card.className = 'movie-card fade-in';
        card.setAttribute('data-movie-id', movie.id);
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.style.animationDelay = `${i * 0.05}s`;
        
        card.innerHTML = `
            <div class="card-icons">
                <button 
                    class="fav-btn ${isFav ? 'favorited' : ''}" 
                    data-id="${movie.id}"
                    aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
                >
                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="poster-wrapper">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title} poster" 
                    class="movie-poster"
                    onerror="this.src='${PLACEHOLDER_POSTER}';"
                >
                <div class="trailer-container" data-movie-id="${movie.id}"></div>
                <div class="poster-overlay">
                    <span class="hover-hint"><i class="fa-solid fa-play"></i> Hover for trailer</span>
                </div>
            </div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p class="movie-meta">${year} • Movie</p>
                <div class="movie-rating">
                    <i class="fa-solid fa-star"></i>
                    <span>${rating}</span>
                </div>
            </div>
        `;
        
        // Hover to play trailer
        const posterWrapper = card.querySelector('.poster-wrapper');
        let hoverTimeout = null;
        
        posterWrapper.addEventListener('mouseenter', async () => {
            // Small delay before loading trailer
            hoverTimeout = setTimeout(async () => {
                const trailerContainer = card.querySelector('.trailer-container');
                const videoKey = await fetchMovieTrailer(movie.id);
                
                if (videoKey) {
                    // Create YouTube iframe with autoplay
                    trailerContainer.innerHTML = `
                        <iframe 
                            src="https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&rel=0&showinfo=0&modestbranding=1"
                            frameborder="0"
                            allow="autoplay; encrypted-media"
                            allowfullscreen
                            class="trailer-iframe"
                        ></iframe>
                    `;
                    trailerContainer.classList.add('active');
                } else {
                    // No trailer available
                    trailerContainer.innerHTML = `<div class="no-trailer">Trailer not available</div>`;
                    trailerContainer.classList.add('active');
                }
            }, 300);
        });
        
        posterWrapper.addEventListener('mouseleave', () => {
            // Clear timeout if mouse leaves quickly
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            
            // Remove trailer iframe
            const trailerContainer = card.querySelector('.trailer-container');
            trailerContainer.innerHTML = '';
            trailerContainer.classList.remove('active');
        });
        
        // Click to open modal
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.fav-btn')) {
                openModal(movie.id);
            }
        });
        
        // Favorite button
        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleFavorite(movie, favBtn);
        });
        
        fragment.appendChild(card);
    }
    
    elements.movieGrid.innerHTML = '';
    elements.movieGrid.appendChild(fragment);
}

// ========================================
// TOGGLE FAVORITE
// ========================================
async function toggleFavorite(movie, btn) {
    const isFav = await isFavorite(movie.id);
    
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);
    
    if (isFav) {
        await removeFavorite(movie.id);
        btn.classList.remove('favorited');
        btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    } else {
        await addFavorite(movie);
        btn.classList.add('favorited');
        btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
    
    await updateFavCount();
    
    if (state.showingFavorites) {
        showFavorites();
    }
}

// ========================================
// MODAL WITH TRAILER + OMDB INFO
// ========================================
async function openModal(movieId) {
    elements.loading.hidden = false;
    
    // Fetch TMDB data and trailer
    const movie = await fetchMovieDetails(movieId);
    const videoKey = await fetchMovieTrailer(movieId);
    
    if (!movie) {
        elements.loading.hidden = true;
        return;
    }
    
    // Get year for OMDB search
    const year = movie.release_date ? movie.release_date.split('-')[0] : null;
    
    // Fetch detailed info from OMDB API
    const omdbData = await searchOMDBByTitle(movie.title, year);
    
    elements.loading.hidden = true;
    
    const isFav = await isFavorite(movie.id);
    const posterUrl = movie.poster_path 
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
        : PLACEHOLDER_POSTER;
    
    // Use OMDB data if available, fallback to TMDB
    const runtime = omdbData?.Runtime || (movie.runtime ? `${movie.runtime} min` : 'N/A');
    const rated = omdbData?.Rated || 'N/A';
    const imdbRating = omdbData?.imdbRating || 'N/A';
    const rottenTomatoes = omdbData?.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value || 'N/A';
    const metacritic = omdbData?.Metascore ? `${omdbData.Metascore}/100` : 'N/A';
    const genres = omdbData?.Genre || (movie.genres ? movie.genres.map(g => g.name).join(', ') : 'N/A');
    const director = omdbData?.Director || movie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
    const writer = omdbData?.Writer || 'N/A';
    const cast = omdbData?.Actors || movie.credits?.cast?.slice(0, 4).map(c => c.name).join(', ') || 'N/A';
    const plot = omdbData?.Plot || movie.overview || 'No description available.';
    const awards = omdbData?.Awards || 'N/A';
    const boxOffice = omdbData?.BoxOffice || (movie.revenue ? '$' + movie.revenue.toLocaleString() : 'N/A');
    const country = omdbData?.Country || 'N/A';
    const language = omdbData?.Language || 'N/A';
    const imdbId = omdbData?.imdbID || null;
    
    elements.modalContent.innerHTML = `
        <div class="modal-video-section">
            ${videoKey ? `
                <div class="modal-trailer">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&rel=0&modestbranding=1"
                        frameborder="0"
                        allow="autoplay; encrypted-media"
                        allowfullscreen
                        class="modal-trailer-iframe"
                    ></iframe>
                </div>
            ` : `
                <div class="modal-poster-container">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title} poster" 
                        class="modal-poster"
                    >
                    <div class="no-trailer-msg">
                        <i class="fa-solid fa-video-slash"></i>
                        <span>Trailer not available</span>
                    </div>
                </div>
            `}
        </div>
        <div class="modal-details">
            <div class="modal-header">
                <h2 id="modalTitle">${movie.title}</h2>
                <div class="modal-badges">
                    <span class="badge">${year || 'N/A'}</span>
                    <span class="badge">${rated}</span>
                    <span class="badge">${runtime}</span>
                </div>
            </div>
            
            <div class="modal-ratings">
                <div class="rating-item imdb">
                    <i class="fa-brands fa-imdb"></i>
                    <span>${imdbRating}/10</span>
                </div>
                ${rottenTomatoes !== 'N/A' ? `
                    <div class="rating-item tomato">
                        <span>🍅</span>
                        <span>${rottenTomatoes}</span>
                    </div>
                ` : ''}
                ${metacritic !== 'N/A' ? `
                    <div class="rating-item meta">
                        <span>Ⓜ️</span>
                        <span>${metacritic}</span>
                    </div>
                ` : ''}
            </div>
            
            <p class="modal-plot">${plot}</p>
            
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <label>Genre</label>
                    <span>${genres}</span>
                </div>
                <div class="modal-info-item">
                    <label>Director</label>
                    <span>${director}</span>
                </div>
                <div class="modal-info-item">
                    <label>Writer</label>
                    <span>${writer}</span>
                </div>
                <div class="modal-info-item">
                    <label>Cast</label>
                    <span>${cast}</span>
                </div>
                <div class="modal-info-item">
                    <label>Box Office</label>
                    <span>${boxOffice}</span>
                </div>
                <div class="modal-info-item">
                    <label>Country</label>
                    <span>${country}</span>
                </div>
                <div class="modal-info-item">
                    <label>Language</label>
                    <span>${language}</span>
                </div>
                ${awards !== 'N/A' ? `
                    <div class="modal-info-item awards">
                        <label>Awards</label>
                        <span>${awards}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-actions">
                <button class="modal-btn primary" id="modalFavBtn">
                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                    ${isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
                ${imdbId ? `
                    <button class="modal-btn secondary" onclick="window.open('https://www.imdb.com/title/${imdbId}', '_blank')">
                        <i class="fa-brands fa-imdb"></i>
                        IMDb
                    </button>
                ` : ''}
                <button class="modal-btn secondary" onclick="window.open('https://www.themoviedb.org/movie/${movie.id}', '_blank')">
                    <i class="fa-solid fa-external-link"></i>
                    TMDB
                </button>
            </div>
        </div>
    `;
    
    // Modal favorite button handler
    document.getElementById('modalFavBtn').addEventListener('click', async () => {
        const currentlyFav = await isFavorite(movie.id);
        const btn = document.getElementById('modalFavBtn');
        
        if (currentlyFav) {
            await removeFavorite(movie.id);
            btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Favorites';
        } else {
            await addFavorite(movie);
            btn.innerHTML = '<i class="fa-solid fa-heart"></i> Remove from Favorites';
        }
        await updateFavCount();
    });
    
    elements.modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    // Stop any playing video by clearing the modal content
    const iframe = elements.modalContent.querySelector('iframe');
    if (iframe) {
        iframe.src = '';
    }
    
    elements.modalOverlay.hidden = true;
    document.body.style.overflow = '';
}


// ========================================
// SKELETON LOADING
// ========================================
function showSkeletonLoading(count = 10) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <article class="movie-card skeleton-card">
                <div class="poster-wrapper">
                    <div class="skeleton skeleton-poster"></div>
                </div>
                <div class="movie-info">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-meta"></div>
                    <div class="skeleton skeleton-rating"></div>
                </div>
            </article>
        `;
    }
    elements.movieGrid.innerHTML = html;
}

// ========================================
// LOAD & SEARCH MOVIES
// ========================================
async function loadMovies() {
    if (isLoading) return;
    isLoading = true;
    
    showSkeletonLoading(10);
    elements.emptyState.hidden = true;
    
    try {
        let data;
        const genreId = GENRE_IDS[state.currentGenre];
        
        if (state.query) {
            // Search mode
            data = await searchMovies(state.query, state.currentPage);
            elements.resultsTitle.textContent = `Results for "${state.query}"`;
        } else if (genreId) {
            // Genre filter mode
            data = await fetchMoviesByGenre(genreId, state.currentPage);
            const genreLabel = state.currentGenre.charAt(0).toUpperCase() + state.currentGenre.slice(1);
            elements.resultsTitle.textContent = `${genreLabel} Movies`;
        } else {
            // Popular movies
            data = await fetchPopularMovies(state.currentPage);
            elements.resultsTitle.textContent = 'Popular Movies';
        }
        
        state.movies = data.results || [];
        state.totalPages = data.total_pages || 1;
        
        // Apply sorting
        if (state.currentSort !== 'relevance') {
            state.movies = sortMovies(state.movies, state.currentSort);
        }
        
        await renderMovies(state.movies);
        updatePagination();
        
    } catch (error) {
        console.error('Error loading movies:', error);
        elements.movieGrid.innerHTML = '';
        elements.emptyState.hidden = false;
    } finally {
        isLoading = false;
    }
}

function sortMovies(movies, sortType) {
    const sorted = [...movies];
    switch (sortType) {
        case 'a-z':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'z-a':
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case 'year-desc':
            return sorted.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
        case 'year-asc':
            return sorted.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
        default:
            return sorted;
    }
}

function updatePagination() {
    if (state.totalPages <= 1) {
        elements.pagination.hidden = true;
        return;
    }
    
    elements.pagination.hidden = false;
    elements.pageInfo.textContent = `Page ${state.currentPage} of ${Math.min(state.totalPages, 500)}`;
    elements.prevBtn.disabled = state.currentPage <= 1;
    elements.nextBtn.disabled = state.currentPage >= state.totalPages;
}

async function showFavorites() {
    state.showingFavorites = true;
    elements.backBtn.hidden = false;
    elements.pagination.hidden = true;
    elements.resultsTitle.textContent = 'My Favorites';
    
    const favorites = await getFavorites();
    await renderMovies(favorites);
}

function goBackToHome() {
    state.showingFavorites = false;
    state.query = '';
    elements.searchInput.value = '';
    elements.backBtn.hidden = true;
    loadMovies();
}

// ========================================
// DEBOUNCE UTILITY
// ========================================
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSearch = debounce(() => {
    state.query = elements.searchInput.value.trim();
    state.currentPage = 1;
    if (state.query.length >= 2) {
        loadMovies();
    } else if (state.query.length === 0) {
        loadMovies();
    }
}, 500);

// ========================================
// INITIALIZE APP
// ========================================
function init() {
    // Load hero background
    initHeroBackground();
    
    // Search input
    elements.searchInput.addEventListener('input', debouncedSearch);
    
    // Search form submit
    elements.searchInput.closest('form').addEventListener('submit', (e) => {
        e.preventDefault();
        state.query = elements.searchInput.value.trim();
        state.currentPage = 1;
        loadMovies();
    });
    
    // Genre filters
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentGenre = btn.dataset.genre;
            state.currentPage = 1;
            state.query = '';
            elements.searchInput.value = '';
            
            if (state.showingFavorites) {
                showFavorites();
            } else {
                loadMovies();
            }
        });
    });
    
    // Sort select
    elements.sortSelect.addEventListener('change', () => {
        state.currentSort = elements.sortSelect.value;
        if (state.showingFavorites) {
            showFavorites();
        } else {
            loadMovies();
        }
    });
    
    // Pagination
    elements.prevBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadMovies();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    elements.nextBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            loadMovies();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modalOverlay.hidden) {
            closeModal();
        }
    });
    
    // Favorites
    elements.fabFavorites.addEventListener('click', showFavorites);
    elements.backBtn.addEventListener('click', goBackToHome);
    
    // Initialize
    updateFavCount();
    loadMovies();
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
