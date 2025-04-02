document.addEventListener('DOMContentLoaded', function() {
  let searchIndex;
  let pagesData;
  
  // Get the base URL for the site
  const baseUrl = document.querySelector('base')?.href || window.location.origin + window.location.pathname;
  
  // Fetch the search index
  fetch(baseUrl + 'search.json')
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

      // Process and clean the data
      pagesData = data.map(page => ({
        ...page,
        title: page.title || page.url.split('/').pop().replace(/-/g, ' '),
        content: (page.content || '').replace(/[\n\r]+/g, ' ').trim()
      }));

      // Build the search index
      searchIndex = lunr(function() {
        this.ref('url');
        this.field('title', { boost: 10 });
        this.field('content');
        
        pagesData.forEach(function(page) {
          this.add(page);
        }, this);
      });
      console.log('Search index built successfully with', pagesData.length, 'pages');
    })
    .catch(error => {
      console.error('Error loading search index:', error);
    });
  
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (!searchInput || !searchResults) {
    console.error('Search elements not found in DOM');
    return;
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
              const content = page.content;
              const snippetLength = 150;
              let snippet = '';
              
              // Try to find the search term in the content
              const searchTermPos = content.toLowerCase().indexOf(query.toLowerCase());
              if (searchTermPos !== -1) {
                const start = Math.max(0, searchTermPos - snippetLength / 2);
                snippet = '...' + content.substr(start, snippetLength) + '...';
              } else {
                snippet = content.substr(0, snippetLength) + '...';
              }
              
              return `<div class="search-result-item" onclick="window.location.href='${page.url}'">
                <strong>${page.title}</strong>
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
    }, 300); // Debounce for 300ms
  });
});