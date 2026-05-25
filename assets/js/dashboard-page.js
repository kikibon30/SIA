const DashboardPage = (() => {
  const ids = {
    dbDot: 'dbStatusDot',
    dbText: 'dbStatusText',
    globalSearch: 'globalSearchInput',
    refreshBtn: 'refreshBtn',
    exportBtn: 'exportDataBtn',
    statTotal: 'statTotal',
    statUpcoming: 'statUpcoming',
    statTreatments: 'statTreatments',
    statCompleted: 'statCompleted',
    statTodayApt: 'statTodayApt',
    statActiveTrt: 'statActiveTrt',
    statCompRate: 'statCompRate',
    notifBadge: 'notifBadge',
    recentAppointments: 'recentAppointments',
    todaySchedule: 'todaySchedule',
    todayDate: 'todayDate',
    treatmentTableBody: 'treatmentTableBody'
  };

  function statusBadge(status) {
    const normalized = (status || 'Unknown').toString().toLowerCase();
    const map = {
      scheduled: 'badge-scheduled',
      completed: 'badge-completed',
      pending: 'badge-pending',
      cancelled: 'badge-cancelled',
      ongoing: 'badge-pending'
    };
    const cls = map[normalized] || 'badge-scheduled';
    return `<span class="badge ${cls}">${status || 'Unknown'}</span>`;
  }

  function setDBStatus(connected, message) {
    const dot = document.getElementById(ids.dbDot);
    const text = document.getElementById(ids.dbText);
    if (dot) {
      dot.className = `db-status-dot ${connected ? 'status-connected' : 'status-disconnected'}`;
      dot.style.background = connected ? '#10b981' : '#ef4444';
    }
    if (text) {
      text.textContent = connected ? (message || 'Supabase Connected') : (message || 'Connection Failed');
      text.style.color = connected ? '#10b981' : '#ef4444';
    }
    if (typeof updateDBStatus === 'function') updateDBStatus(connected);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function initConnection() {
    if (!window.db || typeof window.db.testConnection !== 'function') return false;
    const result = await window.db.testConnection();
    window._supabaseReady = result.success === true;
    setDBStatus(result.success === true, result.message || '');
    return window._supabaseReady;
  }

  async function loadStats() {
    try {
      const stats = await window.db.getStats();
      document.getElementById(ids.statTotal).textContent = stats.totalAppointments;
      document.getElementById(ids.statUpcoming).textContent = stats.upcomingAppointments;
      document.getElementById(ids.statTreatments).textContent = stats.totalTreatments;
      document.getElementById(ids.statCompleted).textContent = stats.completedTreatments;
      document.getElementById(ids.statTodayApt).textContent = `${stats.scheduledToday} today`;
      document.getElementById(ids.statActiveTrt).textContent = `${stats.pendingTreatments} ongoing`;
      document.getElementById(ids.statCompRate).textContent = `${stats.totalTreatments ? Math.round((stats.completedTreatments / stats.totalTreatments) * 100) : 0}% completion rate`;
      document.getElementById(ids.notifBadge).textContent = stats.upcomingAppointments;
    } catch (error) {
      console.error('Dashboard loadStats error:', error);
    }
  }

  async function loadRecentAppointments() {
    try {
      const appointments = await window.db.getAppointments();
      const recent = (appointments || []).slice(0, 5);
      const container = document.getElementById(ids.recentAppointments);
      if (!container) return;
      if (!recent.length) {
        container.innerHTML = '<div class="empty-state">No appointments yet</div>';
        return;
      }
      container.innerHTML = recent.map((apt) => `
        <div class="recent-item">
          <div class="recent-item-icon">📅</div>
          <div class="recent-item-content">
            <div class="recent-item-title">${apt.patient_name || 'Unknown'}</div>
            <div class="recent-item-sub">${apt.doctor_name || '—'} · ${formatDate(apt.date)} ${apt.time || ''}</div>
          </div>
          <div>${statusBadge(apt.status)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Dashboard loadRecentAppointments error:', error);
      const container = document.getElementById(ids.recentAppointments);
      if (container) container.innerHTML = '<div class="empty-state">Error loading appointments</div>';
    }
  }

  async function loadTodaySchedule() {
    try {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById(ids.todayDate).textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const appointments = await window.db.getAppointments({ date_from: today, date_to: today });
      const container = document.getElementById(ids.todaySchedule);
      if (!container) return;
      if (!appointments.length) {
        container.innerHTML = '<div class="empty-state">No appointments today</div>';
        return;
      }
      container.innerHTML = appointments.map((apt) => `
        <div class="recent-item">
          <div class="recent-item-icon">${apt.time || '--'}</div>
          <div class="recent-item-content">
            <div class="recent-item-title">${apt.patient_name || 'Unknown'}</div>
            <div class="recent-item-sub">${apt.type || 'Consultation'} · ${apt.doctor_name || '—'}</div>
          </div>
          <div>${statusBadge(apt.status)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Dashboard loadTodaySchedule error:', error);
    }
  }

  async function loadRecentTreatments() {
    try {
      const treatments = await window.db.getTreatments();
      const recent = (treatments || []).slice(0, 5);
      const tbody = document.getElementById(ids.treatmentTableBody);
      if (!tbody) return;
      if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No treatments recorded</div></td></tr>';
        return;
      }
      tbody.innerHTML = recent.map((t) => `
        <tr>
          <td><strong>${t.patient_name || 'Unknown'}</strong><div style="font-size:0.7rem; color:#64748b;">${t.patient_id || ''}</div></td>
          <td>${t.diagnosis || '—'}</td>
          <td>${t.type || '—'}</td>
          <td>${t.doctor_name || '—'}</td>
          <td>${formatDate(t.date)}</td>
          <td>${statusBadge(t.status)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Dashboard loadRecentTreatments error:', error);
    }
  }

  async function handleSearch(query) {
    try {
      if (!query || !query.trim()) {
        await loadRecentAppointments();
        return;
      }
      const results = await window.db.getAppointments({ patient_name: query.trim() });
      const container = document.getElementById(ids.recentAppointments);
      if (!container) return;
      if (!results.length) {
        container.innerHTML = `<div class="empty-state">No results for "${query}"</div>`;
        return;
      }
      container.innerHTML = results.slice(0, 5).map((apt) => `
        <div class="recent-item">
          <div class="recent-item-icon">📅</div>
          <div class="recent-item-content">
            <div class="recent-item-title">${apt.patient_name || 'Unknown'}</div>
            <div class="recent-item-sub">${formatDate(apt.date)} ${apt.time || ''}</div>
          </div>
          <div>${statusBadge(apt.status)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Dashboard handleSearch error:', error);
    }
  }

  async function exportData() {
    try {
      const appointments = await window.db.getAppointments();
      const treatments = await window.db.getTreatments();
      const payload = {
        exported_at: new Date().toISOString(),
        appointments,
        treatments
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `medcenter_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('success', 'Export completed', 'JSON file downloaded');
    } catch (error) {
      console.error('Dashboard exportData error:', error);
      showToast('error', 'Export failed', error.message || 'Unable to export');
    }
  }

  function showToast(type, title, message) {
    if (typeof Toast !== 'undefined') {
      Toast[type](title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  }

  async function loadAllData() {
    await Promise.all([
      loadStats(),
      loadRecentAppointments(),
      loadTodaySchedule(),
      loadRecentTreatments()
    ]);
  }

  function initEvents() {
    const refreshBtn = document.getElementById(ids.refreshBtn);
    const exportBtn = document.getElementById(ids.exportBtn);
    const searchInput = document.getElementById(ids.globalSearch);

    if (refreshBtn) refreshBtn.addEventListener('click', loadAllData);
    if (exportBtn) exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportData(); });
    if (searchInput) searchInput.addEventListener('input', debounce((e) => handleSearch(e.target.value), 250));
  }

  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  async function init() {
    await initConnection();
    initEvents();
    await loadAllData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
