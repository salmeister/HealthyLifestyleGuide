function initSearch() {
  let searchIndex;
  let pagesData;
  
  // Explicitly set the URL to the root search.json file
  const searchJsonUrl = window.location.protocol + '//' + window.location.host + '/search.json';
  
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (!searchInput || !searchResults) {
    console.error('Search elements not found in DOM');
    return;
  }

  // Show a loading indicator
  searchResults.innerHTML = '<div class="search-result-item">Loading search index...</div>';
  searchResults.style.display = 'block';

  // Fetch the search index with a cache-busting parameter, always from root
  console.log('Fetching search index from:', searchJsonUrl);
  fetch(searchJsonUrl + '?v=' + new Date().getTime())
    .then(response => {
      if (!response.ok) {
        console.error('Failed to load search.json:', response.status, response.statusText);
        throw new Error('Network response was not ok: ' + response.status);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON, received:', contentType);
      }
      return response.text().then(text => {
        try {
          console.log('Raw search data first 100 chars:', text.substring(0, 100) + '...');
          return JSON.parse(text);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          throw new Error('Invalid JSON: ' + e.message);
        }
      });
    })
    .then(data => {
      console.log('Loaded search data:', data);
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('Search index is empty or invalid');
        searchResults.innerHTML = '<div class="search-result-item">Search index is empty. Try again later.</div>';
        return;
      }

      // Store the pages data
      pagesData = data;

      // Process the data to extract titles from content ahead of time
      pagesData = pagesData.map(page => {
        try {
          const content = page.content || '';
          let displayTitle = '';

          if (page.rawTitle) {
            // Split content by ## to find headers
            const headers = page.rawTitle.split(/##\s+/);
            // Find the header after the back arrow
            for (let i = 0; i < headers.length; i++) {
              if (headers[i].includes('[⬅️](/)') && i + 1 < headers.length) {
                // Get the next header after the back arrow
                const titleMatch = headers[i + 1].match(/\[([^\]]+)\]/);
                if (titleMatch && titleMatch[1]) {
                  displayTitle = cleanMarkdown(titleMatch[1]);
                  break;
                }
              }
            }
          } else if (page.title === "Home") {
            displayTitle = page.title;
          }

          // Clean up the content for the snippet
          const cleanContent = cleanMarkdown(content);

          return {
            ...page,
            displayTitle: displayTitle,
            cleanContent: cleanContent
          };
        } catch (e) {
          console.error('Error processing page:', e);
          return page;
        }
      });

      // Build the search index
      searchIndex = lunr(function() {
        this.ref('url');
        this.field('displayTitle', { boost: 15 });
        this.field('cleanContent');
        
        pagesData.forEach(function(page) {
          try {
            this.add(page);
          } catch (e) {
            console.error('Error adding page to index:', page.url, e);
          }
        }, this);
      });

      console.log('Search index built successfully with', pagesData.length, 'pages');
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      
      // Check for any existing search query
      if (searchInput.value.trim()) {
        performSearch(searchInput.value.trim());
      }
    })
    .catch(error => {
      console.error('Error loading search index:', error);
      searchResults.innerHTML = '<div class="search-result-item">Error loading search index: ' + error.message + '</div>';
      searchResults.style.display = 'block';
    });

  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\[\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace [[text](url) with text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')   // Replace [text](url) with text
      .replace(/\*\*([^*]+)\*\*/g, '$1')          // Replace **text** with text
      .replace(/\*([^*]+)\*/g, '$1')              // Replace *text* with text
      .replace(/`([^`]+)`/g, '$1')                // Replace `text` with text
      .replace(/\[\d+\]/g, '')                    // Remove [1], [2], etc.
      .replace(/[#]+\s/g, '')                     // Remove heading markers
      .replace(/📝/g, '')                         // Remove note emoji
      .replace(/💪/g, '')                         // Remove muscle/exercise emoji
      .replace(/🍖/g, '')                         // Remove meat/diet emoji
      .replace(/🍲/g, '')                         // Remove food emoji
      .replace(/😇/g, '')                         // Remove happiness emoji
      .replace(/🧠/g, '')                         // Remove brain emoji
      .replace(/😴/g, '')                         // Remove sleep emoji
      .replace(/⚕️/g, '')                         // Remove health emoji
      .replace(/🔗/g, '')                         // Remove link emoji
      .replace(/\[⬅️\]\(\//g, '')                // Remove back links
      .replace(/\n/g, ' ')                        // Replace newlines with spaces
      .replace(/\s+/g, ' ')                       // Normalize whitespace
      .trim();
  }

  function performSearch(query) {
    if (!searchIndex) {
      console.warn('Search index not yet loaded');
      searchResults.innerHTML = '<div class="search-result-item">Loading search index...</div>';
      searchResults.style.display = 'block';
      return;
    }
    
    try {
      // Use * for partial matching to improve search results
      const searchQuery = query.split(' ').map(term => `${term}*`).join(' ');
      const results = searchIndex.search(searchQuery);
      console.log('Search results for "' + query + '":', results);
      
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
      } else {
        const resultsHtml = results
          .map(result => {
            const page = pagesData.find(p => p.url === result.ref);
            if (!page) return '';
            
            // Extract a relevant snippet of content
            const snippetLength = 100;
            let snippet = '';
            
            // Try to find the search term in the content
            const searchTermPos = page.cleanContent.toLowerCase().indexOf(query.toLowerCase());
            if (searchTermPos !== -1) {
              const start = Math.max(0, searchTermPos - Math.floor(snippetLength / 2));
              snippet = '...' + page.cleanContent.substr(start, snippetLength) + '...';
            } else {
              snippet = page.cleanContent.substr(0, snippetLength) + '...';
            }
            
            return `<div class="search-result-item" onclick="window.location.href='${page.url}'">
              <strong>${page.displayTitle || ''}</strong>
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