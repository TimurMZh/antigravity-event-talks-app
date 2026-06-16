// Global State
let allReleases = [];
let selectedReleases = new Set();
let activeFilterType = 'all';
let searchQuery = '';
let sortBy = 'newest';
let currentTheme = 'dark';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const sortSelect = document.getElementById('sort-select');
const typePills = document.getElementById('type-pills');
const releaseNotesFeed = document.getElementById('release-notes-feed');
const feedResultsTitle = document.getElementById('feed-results-title');
const feedResultsSubtitle = document.getElementById('feed-results-subtitle');
const cacheTimeDisplay = document.getElementById('cache-time');
const floatingActions = document.getElementById('floating-actions');
const selectedCountDisplay = document.getElementById('selected-count');
const clearSelectedBtn = document.getElementById('clear-selected-btn');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Stats Elements
const statAll = document.getElementById('stat-all');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statOther = document.getElementById('stat-other');
const countAll = document.getElementById('count-all');
const countFeatures = document.getElementById('count-features');
const countIssues = document.getElementById('count-issues');
const countOther = document.getElementById('count-other');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-text');
const charCounter = document.getElementById('char-counter');
const charWarning = document.getElementById('char-warning');
const tweetPreviewRendered = document.getElementById('tweet-preview-rendered');
const modalCloseBtn = document.getElementById('modal-close-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    setLoadingState();
    
    // Animate spinner
    const spinner = refreshBtn.querySelector('.spinner-icon');
    spinner.classList.add('spinning');
    refreshBtn.disabled = true;
    
    try {
        const url = `/api/releases?refresh=${forceRefresh}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allReleases = result.data;
            updateStats();
            filterAndRender();
            
            // Render Cache/Fetched Time
            if (result.last_fetched) {
                const date = new Date(result.last_fetched * 1000);
                cacheTimeDisplay.textContent = `Last updated: ${date.toLocaleTimeString()}`;
            }
        } else {
            showToast('Failed to fetch release notes.', true);
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Network error while fetching release notes.', true);
    } finally {
        spinner.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Set Loading Skeleton State
function setLoadingState() {
    releaseNotesFeed.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
    feedResultsSubtitle.textContent = 'Loading...';
    cacheTimeDisplay.textContent = '';
}

// Update Dashboard Counters
function updateStats() {
    const total = allReleases.length;
    const features = allReleases.filter(r => r.type === 'Feature').length;
    const issues = allReleases.filter(r => r.type === 'Issue').length;
    const others = total - (features + issues);
    
    countAll.textContent = total;
    countFeatures.textContent = features;
    countIssues.textContent = issues;
    countOther.textContent = others;
}

// Filter and Render Feed
function filterAndRender() {
    // 1. Filter by active tab type
    let filtered = allReleases;
    if (activeFilterType !== 'all') {
        if (activeFilterType === 'Other') {
            filtered = allReleases.filter(r => r.type !== 'Feature' && r.type !== 'Issue');
        } else {
            filtered = allReleases.filter(r => r.type === activeFilterType);
        }
    }
    
    // 2. Filter by search query
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(r => {
            const inText = r.text.toLowerCase().includes(query);
            const inDate = r.date.toLowerCase().includes(query);
            const inType = r.type.toLowerCase().includes(query);
            return inText || inDate || inType;
        });
    }
    
    // 3. Sort
    filtered.sort((a, b) => {
        // Since dates are e.g. "June 15, 2026", we parse or use the ISO 'updated' string if available
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    renderFeed(filtered);
}

// Render release note list to DOM
function renderFeed(items) {
    // Clear feed
    releaseNotesFeed.innerHTML = '';
    
    // Update subtitle status
    const countText = items.length === 1 ? '1 update found' : `${items.length} updates found`;
    feedResultsSubtitle.textContent = countText;
    
    let filterTitle = 'All Release Notes';
    if (activeFilterType !== 'all') {
        filterTitle = activeFilterType === 'Other' ? 'Other Updates' : `${activeFilterType}s`;
    }
    if (searchQuery.trim() !== '') {
        filterTitle = `Search results for "${searchQuery}"`;
    }
    feedResultsTitle.textContent = filterTitle;
    
    if (items.length === 0) {
        releaseNotesFeed.innerHTML = `
            <div class="no-results">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No release notes match your criteria</h3>
                <p>Try clearing search text or choosing another category.</p>
                <button class="btn btn-secondary btn-sm" onclick="clearFilters()">Reset Filters</button>
            </div>
        `;
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `release-card ${selectedReleases.has(item.id) ? 'selected' : ''}`;
        card.dataset.id = item.id;
        
        // Determine type badge class
        let badgeClass = 'badge-other';
        const typeLower = item.type.toLowerCase();
        if (typeLower === 'feature') badgeClass = 'badge-feature';
        else if (typeLower === 'issue') badgeClass = 'badge-issue';
        else if (typeLower === 'changed') badgeClass = 'badge-changed';
        else if (typeLower === 'deprecated') badgeClass = 'badge-deprecated';
        
        // Checked state
        const isChecked = selectedReleases.has(item.id) ? 'checked' : '';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <div class="select-wrapper">
                        <input type="checkbox" class="custom-checkbox card-select" data-id="${item.id}" ${isChecked}>
                    </div>
                    <span class="card-date">${item.date}</span>
                    <span class="badge ${badgeClass}">${item.type}</span>
                </div>
                ${item.link ? `
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official release notes">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                ` : ''}
            </div>
            <div class="card-body">
                ${item.html}
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary copy-text-btn" data-id="${item.id}" title="Copy Clean Text to Clipboard">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy Text</span>
                </button>
                <button class="btn btn-primary tweet-card-btn" data-id="${item.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="x-icon">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        releaseNotesFeed.appendChild(card);
    });
    
    // Bind event listeners to new elements
    bindCardEvents();
}

// Reset all filters
window.clearFilters = function() {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    activeFilterType = 'all';
    
    // Reset pills active state
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.pill[data-type="all"]').classList.add('active');
    
    // Reset stats cards active state
    document.querySelectorAll('.stat-card').forEach(s => s.classList.remove('active'));
    statAll.classList.add('active');
    
    filterAndRender();
};

// Bind Events inside release cards
function bindCardEvents() {
    // Checkbox selections
    document.querySelectorAll('.card-select').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const card = document.querySelector(`.release-card[data-id="${id}"]`);
            
            if (e.target.checked) {
                selectedReleases.add(id);
                card.classList.add('selected');
            } else {
                selectedReleases.delete(id);
                card.classList.remove('selected');
            }
            updateFloatingActionBar();
        });
    });
    
    // Click card to select (except on links/buttons/checkboxes)
    document.querySelectorAll('.release-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) {
                return; // Let native handlers act
            }
            const cb = card.querySelector('.card-select');
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
        });
    });
    
    // Copy clean text button
    document.querySelectorAll('.copy-text-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const item = allReleases.find(r => r.id === id);
            if (item) {
                navigator.clipboard.writeText(item.text);
                showToast('Cleaned release note text copied to clipboard!');
            }
        });
    });
    
    // Tweet single card button
    document.querySelectorAll('.tweet-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const item = allReleases.find(r => r.id === id);
            if (item) {
                openTweetComposer(item);
            }
        });
    });
}

// Update Floating Action Bar status
function updateFloatingActionBar() {
    const count = selectedReleases.size;
    if (count > 0) {
        selectedCountDisplay.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
        floatingActions.classList.add('show');
    } else {
        floatingActions.classList.remove('show');
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    });
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.trim() !== '') {
            searchClearBtn.style.display = 'block';
        } else {
            searchClearBtn.style.display = 'none';
        }
        filterAndRender();
    });
    
    // Clear search
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        filterAndRender();
    });
    
    // Sort Select
    sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        filterAndRender();
    });
    
    // Pills filter click
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            // Sync with stats dashboard highlight
            document.querySelectorAll('.stat-card').forEach(s => s.classList.remove('active'));
            const type = pill.dataset.type;
            
            if (type === 'all') statAll.classList.add('active');
            else if (type === 'Feature') statFeatures.classList.add('active');
            else if (type === 'Issue') statIssues.classList.add('active');
            else statOther.classList.add('active');
            
            activeFilterType = type;
            filterAndRender();
        });
    });
    
    // Stats dashboard card click
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.stat-card').forEach(s => s.classList.remove('active'));
            card.classList.add('active');
            
            const filterType = card.dataset.filter;
            activeFilterType = filterType;
            
            // Sync with pills
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            let pillType = filterType === 'all' ? 'all' : filterType;
            // Map 'Other' stat card to 'Changed' or handle custom
            if (filterType === 'Other') {
                // select no specific pill or select 'Changed' for visual simplicity
            } else {
                const targetPill = document.querySelector(`.pill[data-type="${pillType}"]`);
                if (targetPill) targetPill.classList.add('active');
            }
            
            filterAndRender();
        });
    });
    
    // Clear selected
    clearSelectedBtn.addEventListener('click', () => {
        selectedReleases.clear();
        document.querySelectorAll('.custom-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
        updateFloatingActionBar();
    });
    
    // Tweet selected combined summary
    tweetSelectedBtn.addEventListener('click', () => {
        openCombinedTweetComposer();
    });
    
    // Modal Close
    modalCloseBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Character counter inside modal
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Copy tweet button
    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text);
        showToast('Tweet text copied!');
    });
    
    // Send tweet (Post to X)
    sendTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });
    
    // Export CSV Button
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            exportToCSV();
        });
    }
}

// Toast notification helper
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Open Composer for Single Update
function openTweetComposer(item) {
    // Generate prefilled tweet text template
    // Target is < 280 characters
    const hashtag = item.type === 'Feature' ? ' #BigQueryFeature' : item.type === 'Issue' ? ' #BigQueryIssue' : ' #BigQuery';
    const prefix = `📢 BigQuery Release Note (${item.date}):\n\n`;
    const suffix = `\n\nRead more: ${item.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes'}${hashtag}`;
    
    // Calculate allowed text size
    const currentBudget = 280 - prefix.length - suffix.length;
    let coreText = item.text;
    if (coreText.length > currentBudget) {
        coreText = coreText.substring(0, currentBudget - 3) + '...';
    }
    
    const prefilledText = `${prefix}${coreText}${suffix}`;
    
    tweetTextarea.value = prefilledText;
    updateCharCount();
    
    // Render HTML preview (with links colored)
    renderPreview(prefilledText);
    
    tweetModal.classList.add('show');
}

// Open Composer for Combined Selection
function openCombinedTweetComposer() {
    const selectedItems = Array.from(selectedReleases)
        .map(id => allReleases.find(r => r.id === id))
        .filter(Boolean);
        
    if (selectedItems.length === 0) return;
    
    // Sort selected items by date (newest first)
    selectedItems.sort((a, b) => new Date(b.updated || b.date) - new Date(a.updated || a.date));
    
    const prefix = `📢 BigQuery Updates Summary:\n\n`;
    const suffix = `\n\nDetails: https://docs.cloud.google.com/bigquery/docs/release-notes #BigQuery #GoogleCloud`;
    
    let listText = '';
    selectedItems.forEach(item => {
        const emoji = item.type === 'Feature' ? '🟢' : item.type === 'Issue' ? '🔴' : '🔵';
        listText += `${emoji} [${item.date}] ${item.text}\n\n`;
    });
    
    // Budget check
    const currentBudget = 280 - prefix.length - suffix.length;
    if (listText.length > currentBudget) {
        // Truncate list text cleanly
        listText = listText.substring(0, currentBudget - 5) + '\n...';
    }
    
    const prefilledText = `${prefix}${listText}${suffix}`;
    
    tweetTextarea.value = prefilledText;
    updateCharCount();
    renderPreview(prefilledText);
    
    tweetModal.classList.add('show');
}

function closeTweetModal() {
    tweetModal.classList.remove('show');
}

// Update char counters
function updateCharCount() {
    const count = tweetTextarea.value.length;
    charCounter.textContent = `${count} / 280`;
    
    if (count > 280) {
        charCounter.classList.add('danger');
        charWarning.style.display = 'block';
        sendTweetBtn.disabled = true;
    } else {
        charCounter.classList.remove('danger');
        charWarning.style.display = 'none';
        sendTweetBtn.disabled = false;
    }
    
    renderPreview(tweetTextarea.value);
}

// Render raw tweet text inside a preview box, converting links to anchor tags
function renderPreview(text) {
    // Escape HTML first
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Identify links (http/https) and color them
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlPattern, '<span class="text-emerald">$1</span>');
    
    // Identify tags/hashtags and color them
    const hashtagPattern = /(#[a-zA-Z0-9_]+)/g;
    escaped = escaped.replace(hashtagPattern, '<span class="text-rose">$1</span>');
    
    tweetPreviewRendered.innerHTML = escaped;
}

// Export filtered release notes to CSV
function exportToCSV() {
    let filtered = allReleases;
    if (activeFilterType !== 'all') {
        if (activeFilterType === 'Other') {
            filtered = allReleases.filter(r => r.type !== 'Feature' && r.type !== 'Issue');
        } else {
            filtered = allReleases.filter(r => r.type === activeFilterType);
        }
    }
    
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(r => {
            const inText = r.text.toLowerCase().includes(query);
            const inDate = r.date.toLowerCase().includes(query);
            const inType = r.type.toLowerCase().includes(query);
            return inText || inDate || inType;
        });
    }
    
    filtered.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    if (filtered.length === 0) {
        showToast('No items to export.', true);
        return;
    }
    
    // Construct CSV file
    const headers = ['Date', 'Type', 'Link', 'Text'];
    const csvRows = [headers.join(',')];
    
    filtered.forEach(item => {
        const row = [
            escapeCSV(item.date),
            escapeCSV(item.type),
            escapeCSV(item.link),
            escapeCSV(item.text)
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_releases_${activeFilterType}_${sortBy}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${filtered.length} updates to CSV!`);
}

// Escape special CSV characters helper
function escapeCSV(val) {
    if (val === undefined || val === null) {
        return '';
    }
    let formatted = val.toString();
    // Double quotes double-up escape
    formatted = formatted.replace(/"/g, '""');
    // Wrap in quotes if it contains commas, double quotes, or newlines
    if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n') || formatted.includes('\r')) {
        return `"${formatted}"`;
    }
    return formatted;
}
