function initSearch() {
  let searchIndex;
  let pagesData;
  
  // Get the site URL, accounting for GitHub Pages path
  const siteUrl = new URL(window.location.href);
  const basePath = siteUrl.pathname.replace(/\/[^/]*$/, '/');
  
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (!searchInput || !searchResults) {
    console.error('Search elements not found in DOM');
    return;
  }

  // Fetch the search index
  console.log('Fetching search index from:', basePath + 'search.json');
  fetch(basePath + 'search.json')
    .then(response => {
      if (!response.ok) {
        console.error('Failed to load search.json:', response.status, response.statusText);
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Loaded search data:', data);
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('Search index is empty or invalid');
        return;
      }

      // Store the pages data
      pagesData = data;

      // Build the search index
      searchIndex = lunr(function() {
        this.ref('url');
        this.field('title', { boost: 10 });
        this.field('category', { boost: 5 });
        this.field('content');
        
        pagesData.forEach(function(page) {
          try {
            this.add(page);
          } catch (e) {
            console.error('Error adding page to index:', page.url, e);
          }
        }, this);
      });

      console.log('Search index built successfully with', pagesData.length, 'pages');
      
      // Check for any existing search query
      if (searchInput.value.trim()) {
        performSearch(searchInput.value.trim());
      }
    })
    .catch(error => {
      console.error('Error loading search index:', error);
      searchResults.innerHTML = '<div class="search-result-item">Error loading search index</div>';
      searchResults.style.display = 'block';
    });

  function performSearch(query) {
    if (!searchIndex) {
      console.warn('Search index not yet loaded');
      searchResults.innerHTML = '<div class="search-result-item">Loading search index...</div>';
      searchResults.style.display = 'block';
      return;
    }
    
    try {
      const results = searchIndex.search(query);
      console.log('Search results for "' + query + '":', results);
      
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
      } else {
        const resultsHtml = results
          .map(result => {
            const page = pagesData.find(p => p.url === result.ref);
            if (!page) return '';
            
            // Extract a relevant snippet of content
            const content = page.content || '';
            const snippetLength = 150;
            let snippet = '';
            
            // Try to find the search term in the content
            const searchTermPos = content.toLowerCase().indexOf(query.toLowerCase());
            if (searchTermPos !== -1) {
              const start = Math.max(0, searchTermPos - Math.floor(snippetLength / 2));
              snippet = '...' + content.substr(start, snippetLength) + '...';
            } else {
              snippet = content.substr(0, snippetLength) + '...';
            }
            
            const category = page.category ? `<span class="search-result-category">${page.category}</span>` : '';
            
            return `<div class="search-result-item" onclick="window.location.href='${page.url}'">
              <strong>${page.title}</strong>
              ${category}
              <div class="search-result-snippet">${snippet}</div>
            </div>`;
          })
          .join('');
        
        searchResults.innerHTML = resultsHtml;
      }
      searchResults.style.display = 'block';
    } catch (error) {
      console.error('Error performing search:', error);
      searchResults.innerHTML = '<div class="search-result-item">Error performing search</div>';
      searchResults.style.display = 'block';
    }
  }

  // Show/hide results container
  searchInput.addEventListener('focus', () => {
    if (searchResults.children.length > 0) {
      searchResults.style.display = 'block';
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });
  
  // Handle search with debouncing
  let searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (!query) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce for 300ms
  });
}

// Initialize search when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Try initializing immediately if Lunr is already loaded
  if (typeof lunr !== 'undefined') {
    console.log('Lunr is loaded, initializing search');
    initSearch();
  } else {
    // Wait for Lunr to load with a fallback
    console.log('Waiting for Lunr to load');
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkLunr = function() {
      if (typeof lunr !== 'undefined') {
        console.log('Lunr loaded, initializing search');
        initSearch();
      } else if (attempts < maxAttempts) {
        attempts++;
        console.log('Lunr not loaded yet, waiting... (Attempt ' + attempts + '/' + maxAttempts + ')');
        setTimeout(checkLunr, 200);
      } else {
        console.error('Lunr failed to load after ' + maxAttempts + ' attempts');
      }
    };
    
    setTimeout(checkLunr, 200);
  }
});