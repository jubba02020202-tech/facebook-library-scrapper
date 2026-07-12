let currentSessionId = null;
let currentData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let sortColumn = '';
let sortDirection = 'asc';
let ws = null;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('connectionStatus').textContent = 'Connected';
    document.getElementById('connectionStatus').className = 'badge bg-success';
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        handleProgress(data);
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  };

  ws.onclose = () => {
    document.getElementById('connectionStatus').textContent = 'Disconnected';
    document.getElementById('connectionStatus').className = 'badge bg-danger';
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    document.getElementById('connectionStatus').textContent = 'Error';
    document.getElementById('connectionStatus').className = 'badge bg-warning';
  };
}

function handleProgress(data) {
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const progressLabel = document.getElementById('progressLabel');
  const progressDetail = document.getElementById('progressDetail');

  document.getElementById('progressSection').style.display = 'block';

  const pct = Math.min(100, data.progress || 0);
  progressBar.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', pct);
  progressPercent.textContent = pct + '%';

  if (data.step === 'facebook') {
    progressLabel.textContent = 'Scrolling Facebook Ads Library...';
    progressDetail.textContent = `Found ${data.adsFound || 0} ads (scroll ${data.scrolls || 0})`;
  } else if (data.step === 'facebook_details') {
    progressLabel.textContent = 'Opening ads for details...';
    progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-warning';
    progressDetail.textContent = `Opening ad ${data.current || 0}/${data.total || 0} (${data.adsFound || 0} extracted)`;
  } else if (data.step === 'facebook_done') {
    progressLabel.textContent = 'Facebook Ads Scanned';
    progressBar.className = 'progress-bar bg-success';
    progressDetail.textContent = data.message || '';
  } else if (data.step === 'crawling') {
    progressLabel.textContent = 'Visiting Websites...';
    progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-info';
    progressDetail.textContent = `${data.message || ''}`;
  } else if (data.step === 'completed') {
    progressLabel.textContent = 'Extraction Complete!';
    progressBar.className = 'progress-bar bg-success';
    progressDetail.textContent = data.message || 'Done!';

    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Extraction';

    if (data.results) {
      currentData = data.results;
      displayResults(data.results, data.totalBusinesses, data.totalPhones);
    }
  } else if (data.step === 'error') {
    progressLabel.textContent = 'Error';
    progressBar.className = 'progress-bar bg-danger';
    progressDetail.textContent = data.message || 'An error occurred';
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Extraction';
  }
}

async function startExtraction() {
  const urlInput = document.getElementById('adsUrl');
  const url = urlInput.value.trim();

  if (!url) {
    showToast('warning', 'Please enter a Facebook Ads Library URL');
    urlInput.focus();
    return;
  }

  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Extracting...';

  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('statsSection').style.display = 'none';
  document.getElementById('tableSection').style.display = 'none';
  document.getElementById('exportSection').style.display = 'none';

  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
  document.getElementById('progressPercent').textContent = '0%';
  document.getElementById('progressLabel').textContent = 'Starting...';
  document.getElementById('progressDetail').textContent = '';

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const result = await response.json();

    if (!response.ok) {
      showToast('danger', result.error || 'Failed to start extraction');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Extraction';
      return;
    }

    currentSessionId = result.sessionId;
    showToast('success', 'Extraction started! Session: ' + currentSessionId);
    loadSessions();

  } catch (err) {
    showToast('danger', 'Network error: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Extraction';
  }
}

async function pollStatus(sessionId) {
  try {
    const response = await fetch(`/api/status/${sessionId}`);
    if (!response.ok) return;

    const data = await response.json();

    if (data.status === 'completed') {
      currentData = data.results || [];
      displayResults(currentData, data.totalBusinesses, data.totalPhones);
      document.getElementById('startBtn').disabled = false;
      document.getElementById('startBtn').innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Extraction';
    }
  } catch (e) {}
}

function displayResults(results, totalBusinesses, totalPhones) {
  currentData = results || [];
  filteredData = [...currentData];
  currentPage = 1;

  document.getElementById('statsSection').style.display = 'block';
  document.getElementById('tableSection').style.display = 'block';

  document.getElementById('totalBusinesses').textContent = totalBusinesses || 0;

  const phonesCount = totalPhones || 0;
  document.getElementById('totalPhones').textContent = phonesCount;

  const withPhones = results ? results.filter(r => r.phones && r.phones.length > 0).length : 0;
  document.getElementById('totalWithPhones').textContent = withPhones;

  const errors = results ? results.filter(r => r.error).length : 0;
  document.getElementById('totalErrors').textContent = errors;

  if (results && results.length > 0) {
    document.getElementById('exportSection').style.display = 'block';
  }

  filterTable();
  loadSessions();
}

function filterTable() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const phoneFilter = document.getElementById('filterPhones').value;

  filteredData = currentData.filter((row) => {
    if (phoneFilter === 'withPhones' && (!row.phones || row.phones.length === 0)) return false;
    if (phoneFilter === 'withoutPhones' && row.phones && row.phones.length > 0) return false;

    if (searchTerm) {
      const phoneTexts = (row.phones || []);
      const searchable = [
        row.businessName, row.pageName, row.websiteUrl, row.cta,
        ...phoneTexts,
      ].join(' ').toLowerCase();
      return searchable.includes(searchTerm);
    }

    return true;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const pageSizeSelect = document.getElementById('pageSize');
  pageSize = parseInt(pageSizeSelect.value, 10);

  const total = filteredData.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageData = filteredData.slice(start, end);

  document.getElementById('resultCount').textContent = total;

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No results found</td></tr>';
    renderPagination(1, 0);
    return;
  }

  let sorted = [...pageData];
  if (sortColumn) {
    sorted.sort((a, b) => {
      let va = (a[sortColumn] || '').toString().toLowerCase();
      let vb = (b[sortColumn] || '').toString().toLowerCase();
      if (sortDirection === 'asc') return va.localeCompare(vb);
      return vb.localeCompare(va);
    });
  }

  sorted.forEach((row) => {
    const tr = document.createElement('tr');

    const hasPhones = row.phones && row.phones.length > 0;
    const hasWhatsApp = row.whatsappLinks && row.whatsappLinks.length > 0;

    tr.innerHTML = `
      <td><strong>${escapeHtml(row.businessName || '—')}</strong></td>
      <td>${escapeHtml(row.pageName || '—')}</td>
      <td>
        ${row.websiteUrl ? `<a href="${escapeHtml(row.websiteUrl)}" target="_blank" class="text-info text-break">${escapeHtml(truncateUrl(row.websiteUrl))}</a>` : '<span class="text-muted">—</span>'}
      </td>
      <td>${row.cta ? `<span class="badge bg-primary">${escapeHtml(row.cta)}</span>` : '—'}</td>
      <td>
        ${hasPhones ? row.phones.map(p => `<span class="phone-badge">${escapeHtml(p)}</span>`).join('') : '<span class="text-muted">—</span>'}
      </td>
      <td>
        ${hasWhatsApp ? row.whatsappLinks.map(w => `<a href="${escapeHtml(w.link)}" target="_blank" class="whatsapp-badge"><i class="bi bi-whatsapp me-1"></i>WA</a>`).join('') : '<span class="text-muted">—</span>'}
      </td>
      <td>
        ${row.error ? `<span class="error-cell"><i class="bi bi-exclamation-triangle me-1"></i>Error</span>` : '<span class="text-success"><i class="bi bi-check-circle"></i></span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(currentPage, totalPages);
}

function renderPagination(current, total) {
  const ul = document.getElementById('pagination');
  ul.innerHTML = '';

  if (total <= 1) return;

  const addPage = (page, label, active) => {
    const li = document.createElement('li');
    li.className = `page-item ${active ? 'active' : ''} ${page < 1 || page > total ? 'disabled' : ''}`;
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = label;
    a.onclick = (e) => {
      e.preventDefault();
      if (page >= 1 && page <= total) {
        currentPage = page;
        renderTable();
      }
    };
    li.appendChild(a);
    ul.appendChild(li);
  };

  addPage(current - 1, '«');
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
    addPage(i, i, i === current);
  }
  addPage(current + 1, '»');
}

function sortTable(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  renderTable();
}

async function exportExcel() {
  if (!currentSessionId) {
    showToast('warning', 'No data to export');
    return;
  }

  try {
    const response = await fetch(`/api/export/${currentSessionId}`);
    if (!response.ok) {
      const err = await response.json();
      showToast('danger', err.error || 'Export failed');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${currentSessionId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast('success', 'Excel file downloaded!');
  } catch (err) {
    showToast('danger', 'Export error: ' + err.message);
  }
}

async function loadSessions() {
  try {
    const response = await fetch('/api/sessions');
    const data = await response.json();
    const div = document.getElementById('sessionsList');

    if (!data.sessions || data.sessions.length === 0) {
      div.innerHTML = '<p class="text-muted small mb-0">No sessions yet</p>';
      return;
    }

    let html = '<div class="list-group list-group-flush">';
    data.sessions.slice(0, 10).forEach((s) => {
      const time = new Date(s.createdAt).toLocaleString();
      const statusBadge = s.status === 'completed' ? 'bg-success' :
        s.status === 'error' ? 'bg-danger' : 'bg-warning';
      html += `
        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center
          ${s.id === currentSessionId ? 'active' : ''}"
          onclick="if('${s.status}'==='completed'){ loadSession('${s.id}'); }"
          style="cursor:${s.status === 'completed' ? 'pointer' : 'default'}">
          <div>
            <small class="text-muted">${time}</small>
            <span class="badge ${statusBadge} ms-2">${s.status}</span>
            ${s.id === currentSessionId ? '<span class="badge bg-primary ms-1">Current</span>' : ''}
          </div>
          <div class="text-end">
            <small>${s.totalBusinesses || 0} businesses</small>
            <small class="ms-2">${s.totalPhones || 0} phones</small>
          </div>
        </div>`;
    });
    html += '</div>';
    div.innerHTML = html;
  } catch (e) {}
}

async function loadSession(sessionId) {
  try {
    const response = await fetch(`/api/status/${sessionId}`);
    const data = await response.json();
    if (data.status === 'completed' && data.results) {
      currentSessionId = sessionId;
      currentData = data.results;
      displayResults(data.results, data.totalBusinesses, data.totalPhones);
      document.getElementById('adsUrl').value = '';
      showToast('info', `Loaded session ${sessionId}`);
    }
  } catch (e) {
    showToast('danger', 'Failed to load session');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncateUrl(url, max = 50) {
  return url.length > max ? url.substring(0, max) + '...' : url;
}

function showToast(type, message) {
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999';
    document.body.appendChild(c);
    return c;
  })();

  const types = {
    success: { icon: 'bi-check-circle-fill', bg: 'bg-success' },
    danger: { icon: 'bi-exclamation-triangle-fill', bg: 'bg-danger' },
    warning: { icon: 'bi-exclamation-circle-fill', bg: 'bg-warning text-dark' },
    info: { icon: 'bi-info-circle-fill', bg: 'bg-info text-dark' },
  };

  const t = types[type] || types.info;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white ${t.bg} border-0 show`;
  toast.role = 'alert';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${t.icon} me-2"></i>${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
  loadSessions();

  document.getElementById('adsUrl').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startExtraction();
  });
});
