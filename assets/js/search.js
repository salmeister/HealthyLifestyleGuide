document.addEventListener('DOMContentLoaded', function() {
  let searchIndex;
  let pagesData;
  
  // Fetch the search index
  fetch(window.location.origin + window.location.pathname + 'search.json')
    .then(response => {
      if (!response.ok) {
        console.error('Failed to load search.json:', response.status, response.statusText);
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Loaded search data:', data);
      if (!data || data.length === 0) {
        console.warn('Search index is empty');
        return;
      }
      pagesData = data;
      searchIndex = lunr(function() {
        this.field('title', { boost: 10 });
        this.field('content');
        this.ref('url');
        
        data.forEach(function(page) {
          this.add(page);
        }, this);
      });
      console.log('Search index built successfully');
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
    searchResults.style.display = 'block';
  });
  
  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = 'none';
    }
  });
  
  // Handle search
  searchInput.addEventListener('input', function() {
    if (!searchIndex) {
      console.warn('Search index not yet loaded');
      return;
    }
    
    const query = this.value;
    if (query === '') {
      searchResults.style.display = 'none';
      return;
    }
    
    try {
      const results = searchIndex.search(query);
      console.log('Search results for "' + query + '":', results);
      
      const resultsHtml = results
        .map(result => {
          const page = pagesData.find(p => p.url === result.ref);
          if (!page) return '';
          const title = page.title || page.url.split('/').pop().replace(/-/g, ' ');
          return `<div class="search-result-item" onclick="window.location.href='${page.url}'">
            <strong>${title}</strong>
          </div>`;
        })
        .join('');
      
      searchResults.innerHTML = resultsHtml || '<div class="search-result-item">No results found</div>';
      searchResults.style.display = 'block';
    } catch (error) {
      console.error('Error performing search:', error);
      searchResults.innerHTML = '<div class="search-result-item">Error performing search</div>';
      searchResults.style.display = 'block';
    }
  });
});