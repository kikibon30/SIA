/**
 * app.js
 * Shared application utilities:
 *  - Toast notification system
 *  - Sidebar collapse/expand logic
 *  - Loading overlay
 *  - Format helpers
 *  - Export utilities
 *  - Global search
 */

/* ──────────────────────────────────────────
   TOAST NOTIFICATIONS
   ────────────────────────────────────────── */
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  function show(type, title, message = '', duration = 4000) {
    const c     = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || 'ℹ'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close-btn" onclick="this.closest('.toast').remove()">✕</button>
    `;

    c.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    const timer = setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);

    toast.querySelector('.toast-close-btn').addEventListener('click', () => clearTimeout(timer));
  }

  return {
    success: (title, msg) => show('success', title, msg),
    error:   (title, msg) => show('error',   title, msg, 6000),
    warning: (title, msg) => show('warning', title, msg),
    info:    (title, msg) => show('info',    title, msg),
  };
})();

/* ──────────────────────────────────────────
   LOADING OVERLAY
   ────────────────────────────────────────── */
const Loader = (() => {
  let overlay;

  function ensure() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text" id="loader-text">Loading…</div>
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  return {
    show(msg = 'Loading…') {
      ensure().querySelector('#loader-text').textContent = msg;
      ensure().classList.add('active');
    },
    hide() {
      if (overlay) overlay.classList.remove('active');
    }
  };
})();

/* ──────────────────────────────────────────
   SIDEBAR LOGIC
   ────────────────────────────────────────── */
function initSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const toggle   = document.querySelector('.sidebar-toggle');
  const overlay  = document.querySelector('.sidebar-overlay');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const main     = document.querySelector('.main-content');

  if (!sidebar) return;

  // Restore collapse state
  const collapsed = localStorage.getItem('sia-sidebar-collapsed') === 'true';
  if (collapsed) sidebar.classList.add('collapsed');

  // Desktop toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sia-sidebar-collapsed', isCollapsed);
      toggle.innerHTML = isCollapsed ? '›' : '‹';
    });
    toggle.innerHTML = sidebar.classList.contains('collapsed') ? '›' : '‹';
  }

  // Mobile open
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      if (overlay) overlay.style.display = 'block';
    });
  }

  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });
  }

  // Highlight active nav item
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
  });
}

/* ──────────────────────────────────────────
   DB STATUS INDICATOR
   ────────────────────────────────────────── */
function updateDBStatus(connected) {
  const el   = document.querySelector('.db-status');
  const text = document.querySelector('.db-status-text');
  if (!el) return;

  el.classList.toggle('connected', connected);
  el.classList.toggle('error', !connected);

  if (text) {
    text.textContent = connected ? 'Supabase Connected' : 'Offline (Local)';
  }
}

/* ──────────────────────────────────────────
   FORMAT HELPERS
   ────────────────────────────────────────── */
const Format = {
  date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  time(t) {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hr  = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
  },

  datetime(dateStr, timeStr) {
    if (!dateStr) return '—';
    return `${Format.date(dateStr)}${timeStr ? ' · ' + Format.time(timeStr) : ''}`;
  },

  relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  },

  initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  },

  statusBadge(status) {
    const key = (status || '').toLowerCase().replace(/\s+/g, '-');
    return `<span class="badge badge-${key}">${status || '—'}</span>`;
  },

  currency(n) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
  }
};

/* ──────────────────────────────────────────
   EXPORT UTILITIES
   ────────────────────────────────────────── */
const Exporter = {
  download(filename, content, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  toCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows    = data.map(row =>
      headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },

  toJSON(data) {
    return JSON.stringify(data, null, 2);
  }
};

/* ──────────────────────────────────────────
   CONFIRM DIALOG (native-style)
   ────────────────────────────────────────── */
function confirmAction(message, onConfirm, onCancel) {
  // Simple confirm using native dialog (can be replaced with custom modal)
  if (confirm(message)) {
    if (typeof onConfirm === 'function') onConfirm();
  } else {
    if (typeof onCancel === 'function') onCancel();
  }
}

/* ──────────────────────────────────────────
   FORM VALIDATION
   ────────────────────────────────────────── */
function validateForm(formEl) {
  let isValid = true;
  formEl.querySelectorAll('[required]').forEach(field => {
    const group = field.closest('.form-group');
    if (!field.value.trim()) {
      if (group) group.classList.add('has-error');
      isValid = false;
    } else {
      if (group) group.classList.remove('has-error');
    }
  });
  return isValid;
}

function clearValidation(formEl) {
  formEl.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

/* ──────────────────────────────────────────
   DEBOUNCE
   ────────────────────────────────────────── */
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/* ──────────────────────────────────────────
   TOPBAR SEARCH (delegates to page handler)
   ────────────────────────────────────────── */
function initTopbarSearch() {
  const input = document.querySelector('.topbar-search input');
  if (!input) return;

  input.addEventListener('input', debounce((e) => {
    if (typeof window.onGlobalSearch === 'function') {
      window.onGlobalSearch(e.target.value);
    }
  }, 300));

  // Keyboard shortcut: Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ──────────────────────────────────────────
   INIT ON DOMContentLoaded
   ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTopbarSearch();

  // Update DB status indicator
  updateDBStatus(window._supabaseReady === true);

  // Listen for cross-tab events
  SIABus.on('*', ({ type }) => {
    // Optionally refresh stats on any mutation
    if (type && (type.includes(':insert') || type.includes(':update') || type.includes(':delete'))) {
      if (typeof window.refreshStats === 'function') window.refreshStats();
    }
  });
});