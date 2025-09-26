function initSearch() {
  let searchIndex = null;
  let pagesData = [];
  const searchJsonUrl = window.location.protocol + '//' + window.location.host + '/search.json';

  const desktop = { input: document.getElementById('search-input'), results: document.getElementById('search-results') };
  const mobile  = { input: document.getElementById('search-input-mobile'), results: document.getElementById('search-results-mobile') };

  if (!desktop.input && !mobile.input) { console.warn('No search inputs found'); return; }

  let active = desktop.input ? desktop : mobile;

  [desktop.results, mobile.results].forEach(r => { if (r) { r.innerHTML='<div class="search-result-item">Loading search index...</div>'; r.style.display='block'; }});

  fetch(searchJsonUrl + '?v=' + Date.now())
    .then(r => { if (!r.ok) throw new Error('Network ' + r.status); return r.json(); })
    .then(data => {
      pagesData = (data||[]).filter(p=>p.url!=='/').map(p=>{ const clean=(p.content||'')
        .replace(/[^\w\s.,;:!?()'"-]/g,'')
        .replace(/\s+/g,' ')
        .replace(/[⬅️]/g,'')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu,'')
        .replace(/[^\x20-\x7E]/g,'')
        .trim(); return {...p, cleanContent:clean}; });
      if(!pagesData.length) throw new Error('Search index empty');
      searchIndex = lunr(function(){
        this.pipeline.remove(lunr.stemmer); this.searchPipeline.remove(lunr.stemmer);
        this.ref('url'); this.field('title',{boost:15}); this.field('cleanContent');
        pagesData.forEach(p=>{ try{ this.add({url:p.url,title:p.title,cleanContent:p.cleanContent}); }catch(e){ console.error('Add fail',p.url,e); }});
      });
      [desktop.results, mobile.results].forEach(r=>{ if(r){ r.innerHTML=''; r.style.display='none'; }});
      [desktop,mobile].forEach(c=>{ if(c.input && c.input.value.trim()){ active=c; performSearch(c.input.value.trim(),c);} });
    })
    .catch(e=>{ console.error('Search init error',e); [desktop.results,mobile.results].forEach(r=>{ if(r){ r.innerHTML='<div class="search-result-item">'+e.message+'</div>'; r.style.display='block'; }}); });

  function performSearch(q, ctx){ ctx = ctx || active; if(!ctx.results) return; if(!searchIndex){ ctx.results.innerHTML='<div class="search-result-item">Loading search index...</div>'; ctx.results.style.display='block'; return; }
    const query = q.split(' ').map(t=>t.length>1?`*${t}*`:t).join(' ');
    let results=[]; try{ results = searchIndex.search(query);}catch(e){ console.error('Search exec',e); }
    if(!results.length){ ctx.results.innerHTML='<div class="search-result-item">No results found</div>'; }
    else { ctx.results.innerHTML=results.map(r=>{ const p=pagesData.find(p=>p.url===r.ref); if(!p) return ''; const len=100; const pos=p.cleanContent.toLowerCase().indexOf(q.toLowerCase()); const start=pos>-1?Math.max(0,pos-Math.floor(len/2)):0; const snippet='...'+p.cleanContent.substr(start,len)+'...'; return `<div class=\"search-result-item\" data-url=\"${p.url}\" role=\"button\" tabindex=\"0\"><strong>${p.title||''}</strong><div class=\"search-result-snippet\">${snippet}</div></div>`; }).join(''); }
    ctx.results.style.display='block';
  }

  [desktop,mobile].forEach(c=>{ if(!c.input) return; let debounce; c.input.addEventListener('focus',()=>{ active=c; if(c.results && c.results.children.length) c.results.style.display='block'; const other=c===desktop?mobile:desktop; if(other.results) other.results.style.display='none'; }); c.input.addEventListener('input',()=>{ active=c; const val=c.input.value.trim(); clearTimeout(debounce); if(!val){ if(c.results){ c.results.style.display='none'; c.results.innerHTML=''; } return; } debounce=setTimeout(()=>performSearch(val,c),250); }); });

  [desktop.results,mobile.results].forEach(r=>{ if(!r) return; r.addEventListener('click',e=>{ const item=e.target.closest('.search-result-item[data-url]'); if(item) window.location.href=item.getAttribute('data-url'); }); r.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const item=e.target.closest('.search-result-item[data-url]'); if(item) window.location.href=item.getAttribute('data-url'); }}); });

  document.addEventListener('click',e=>{ const inside=[desktop,mobile].some(c=>c.results && (c.results.contains(e.target) || (c.input && c.input===e.target))); if(!inside) [desktop.results,mobile.results].forEach(r=>{ if(r) r.style.display='none'; }); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ [desktop.results,mobile.results].forEach(r=>{ if(r) r.style.display='none'; }); }});
}

// Initialize when DOM & (possibly deferred) lunr script are ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lunr !== 'undefined') {
    initSearch();
  } else {
    // Poll briefly if lunr not yet loaded
    let attempts = 0; const max = 12;
    const poll = () => {
      if (typeof lunr !== 'undefined') { initSearch(); }
      else if (attempts++ < max) { setTimeout(poll, 200); }
      else { console.error('Lunr failed to load for search initialization'); }
    };
    poll();
  }
});