  // ---------- MOCK DATABASE (localStorage) ----------
  const STORAGE_KEYS = { appointments: 'med_appointments', treatments: 'med_treatments' };
  
  function initMockData() {
    if (!localStorage.getItem(STORAGE_KEYS.appointments)) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const mockAppointments = [
        { id: '1', patient_name: 'Emma Johnson', doctor_name: 'Dr. Smith', date: today, time: '09:30', status: 'scheduled', type: 'Checkup' },
        { id: '2', patient_name: 'Michael Chen', doctor_name: 'Dr. Adams', date: today, time: '11:00', status: 'scheduled', type: 'Follow-up' },
        { id: '3', patient_name: 'Sophia Lee', doctor_name: 'Dr. Smith', date: tomorrow, time: '14:15', status: 'scheduled', type: 'Consultation' },
        { id: '4', patient_name: 'James Brown', doctor_name: 'Dr. Williams', date: yesterday, time: '10:00', status: 'completed', type: 'Routine' },
        { id: '5', patient_name: 'Olivia Davis', doctor_name: 'Dr. Adams', date: tomorrow, time: '09:00', status: 'scheduled', type: 'Checkup' }
      ];
      localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(mockAppointments));
    }
    if (!localStorage.getItem(STORAGE_KEYS.treatments)) {
      const mockTreatments = [
        { id: 't1', patient_name: 'Emma Johnson', patient_id: 'P001', diagnosis: 'Hypertension', type: 'Medication', doctor_name: 'Dr. Smith', date: new Date().toISOString().split('T')[0], status: 'completed' },
        { id: 't2', patient_name: 'Michael Chen', patient_id: 'P002', diagnosis: 'Sprain', type: 'Therapy', doctor_name: 'Dr. Adams', date: new Date().toISOString().split('T')[0], status: 'pending' },
        { id: 't3', patient_name: 'Sophia Lee', patient_id: 'P003', diagnosis: 'Allergy', type: 'Prescription', doctor_name: 'Dr. Williams', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], status: 'completed' },
        { id: 't4', patient_name: 'James Brown', patient_id: 'P004', diagnosis: 'Back Pain', type: 'Physical Therapy', doctor_name: 'Dr. Smith', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], status: 'completed' }
      ];
      localStorage.setItem(STORAGE_KEYS.treatments, JSON.stringify(mockTreatments));
    }
  }
  initMockData();

  // DB Helper
  const db = {
    getAppointments: async (filter) => {
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || '[]');
      if (filter && filter.date_from && filter.date_to) {
        list = list.filter(apt => apt.date === filter.date_from);
      }
      if (filter && filter.patient_name) {
        list = list.filter(apt => apt.patient_name.toLowerCase().includes(filter.patient_name.toLowerCase()));
      }
      return list.sort((a, b) => (a.date + a.time) > (b.date + b.time) ? -1 : 1);
    },
    getTreatments: async () => {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.treatments) || '[]');
    },
    getStats: async () => {
      const appointments = await db.getAppointments();
      const treatments = await db.getTreatments();
      const todayStr = new Date().toISOString().split('T')[0];
      const scheduledToday = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled').length;
      const upcoming = appointments.filter(a => a.date >= todayStr && a.status === 'scheduled').length;
      const completedTreatments = treatments.filter(t => t.status === 'completed').length;
      const pendingTreatments = treatments.filter(t => t.status === 'pending').length;
      return {
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming,
        totalTreatments: treatments.length,
        completedTreatments: completedTreatments,
        scheduledToday: scheduledToday,
        pendingTreatments: pendingTreatments
      };
    }
  };

  // Format Helpers
  const Format = {
    date: (d) => d ? new Date(d).toLocaleDateString() : '—',
    time: (t) => t || '—',
    datetime: (d, t) => `${Format.date(d)} ${t || ''}`,
    statusBadge: (status) => {
      const map = { scheduled: 'Scheduled', completed: 'Completed', pending: 'Pending', cancelled: 'Cancelled' };
      let cls = 'badge ';
      if (status === 'scheduled') cls += 'badge-scheduled';
      else if (status === 'completed') cls += 'badge-completed';
      else if (status === 'pending') cls += 'badge-pending';
      else cls += 'badge-cancelled';
      return `<span class="${cls}">${map[status] || status}</span>`;
    },
    initials: (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'
  };

  // Exporter
  const Exporter = {
    toCSV: (data) => {
      if (!data.length) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map(obj => headers.map(h => JSON.stringify(obj[h] || '')).join(','));
      return [headers.join(','), ...rows].join('\n');
    },
    download: (filename, content, mime) => {
      const blob = new Blob([content], { type: mime });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  // Load Dashboard Functions
  async function refreshStats() {
    const stats = await db.getStats();
    document.getElementById('statTotal').textContent = stats.totalAppointments;
    document.getElementById('statUpcoming').textContent = stats.upcomingAppointments;
    document.getElementById('statTreatments').textContent = stats.totalTreatments;
    document.getElementById('statCompleted').textContent = stats.completedTreatments;
    document.getElementById('statTodayApt').textContent = `${stats.scheduledToday} today`;
    document.getElementById('statActiveTrt').textContent = `${stats.pendingTreatments} ongoing`;
    const rate = stats.totalTreatments ? Math.round((stats.completedTreatments / stats.totalTreatments) * 100) : 0;
    document.getElementById('statCompRate').textContent = `${rate}% completion rate`;
    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = stats.upcomingAppointments;
  }

  async function loadRecentAppointments() {
    const appointments = await db.getAppointments();
    const recent = appointments.slice(-5).reverse();
    const container = document.getElementById('recentAppointments');
    if (!recent.length) {
      container.innerHTML = `<div class="empty-state">No appointments yet</div>`;
      return;
    }
    container.innerHTML = recent.map(apt => `
      <div class="recent-item">
        <div class="recent-item-icon">📅</div>
        <div class="recent-item-content">
          <div class="recent-item-title">${apt.patient_name}</div>
          <div class="recent-item-sub">${apt.doctor_name || '—'} · ${Format.datetime(apt.date, apt.time)}</div>
        </div>
        <div>${Format.statusBadge(apt.status)}</div>
      </div>
    `).join('');
  }

  async function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayDate').textContent = Format.date(today);
    const all = await db.getAppointments({ date_from: today, date_to: today });
    const container = document.getElementById('todaySchedule');
    if (!all.length) {
      container.innerHTML = `<div class="empty-state">No appointments today</div>`;
      return;
    }
    container.innerHTML = all.map(apt => `
      <div class="recent-item">
        <div class="recent-item-icon">${apt.time || '--'}</div>
        <div class="recent-item-content">
          <div class="recent-item-title">${apt.patient_name}</div>
          <div class="recent-item-sub">${apt.type || 'Consult'} · ${apt.doctor_name || '—'}</div>
        </div>
        <div>${Format.statusBadge(apt.status)}</div>
      </div>
    `).join('');
  }

  async function loadRecentTreatments() {
    const treatments = await db.getTreatments();
    const recent = treatments.slice(0, 5);
    const tbody = document.getElementById('treatmentTableBody');
    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No treatments recorded</div></td></tr>`;
      return;
    }
    tbody.innerHTML = recent.map(t => `
      <tr>
        <td><strong>${t.patient_name}</strong><div style="font-size:0.7rem; color:#64748b;">${t.patient_id || ''}</div></td>
        <td>${t.diagnosis || '—'}</td>
        <td>${t.type || '—'}</td>
        <td>${t.doctor_name || '—'}</td>
        <td>${Format.date(t.date)}</td>
        <td>${Format.statusBadge(t.status)}</td>
      </tr>
    `).join('');
  }

  async function handleExport() {
    const appointments = await db.getAppointments();
    const treatments = await db.getTreatments();
    const csvContent = "Appointments\n" + Exporter.toCSV(appointments) + "\n\nTreatments\n" + Exporter.toCSV(treatments);
    Exporter.download(`medcenter_export_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv');
    alert("Export completed! Data downloaded as CSV.");
  }

  async function loadAll() {
    await Promise.all([refreshStats(), loadRecentAppointments(), loadTodaySchedule(), loadRecentTreatments()]);
  }

  // Global search
  document.getElementById('globalSearchInput')?.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (!query) { loadRecentAppointments(); return; }
    const filtered = await db.getAppointments({ patient_name: query });
    const container = document.getElementById('recentAppointments');
    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No results for "${query}"</div>`;
      return;
    }
    container.innerHTML = filtered.slice(0, 5).map(apt => `
      <div class="recent-item">
        <div class="recent-item-icon">📅</div>
        <div class="recent-item-content">
          <div class="recent-item-title">${apt.patient_name}</div>
          <div class="recent-item-sub">${Format.datetime(apt.date, apt.time)}</div>
        </div>
        <div>${Format.statusBadge(apt.status)}</div>
      </div>
    `).join('');
  });

  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    await loadAll();
    alert("Dashboard refreshed!");
  });

  // Export button
  document.getElementById('exportDataBtn')?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    handleExport(); 
  });

  // Mobile sidebar toggle (optional)
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay) {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Initialize dashboard
  window.addEventListener('load', loadAll);
