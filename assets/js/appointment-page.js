const AppointmentPage = (() => {
  const state = {
    appointments: [],
    editingId: null
  };

  function statusBadge(status) {
    const normalized = (status || 'Scheduled').toString().toLowerCase();
    const map = {
      scheduled: 'badge-scheduled',
      completed: 'badge-completed',
      pending: 'badge-pending',
      cancelled: 'badge-cancelled',
      ongoing: 'badge-pending'
    };
    return `<span class="badge ${map[normalized] || 'badge-scheduled'}">${status || 'Scheduled'}</span>`;
  }

  function getFormData() {
    return {
      patient_name: document.getElementById('patientName').value.trim(),
      patient_id: document.getElementById('patientId').value.trim() || null,
      doctor_name: document.getElementById('doctorName').value.trim(),
      date: document.getElementById('appointmentDate').value,
      time: document.getElementById('appointmentTime').value,
      type: document.getElementById('appointmentType').value,
      status: document.getElementById('appointmentStatus').value
    };
  }

  function renderAppointments(filtered = null) {
    const list = filtered || state.appointments || [];
    const tbody = document.getElementById('appointmentsTableBody');
    const count = document.getElementById('tableCount');
    if (!tbody || !count) return;

    count.textContent = `${list.length} appointment${list.length !== 1 ? 's' : ''}`;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No appointments found</div></td></tr>';
      return;
    }

    tbody.innerHTML = list.map((appointment) => `
      <tr>
        <td>${appointment.date || '—'}</td>
        <td>${appointment.time || '—'}</td>
        <td>${appointment.patient_name || '—'}<div class="text-muted">${appointment.patient_id || ''}</div></td>
        <td>${appointment.doctor_name || '—'}</td>
        <td>${appointment.type || '—'}</td>
        <td>${statusBadge(appointment.status)}</td>
        <td style="text-align:right;"><div class="table-actions"><button class="btn btn-secondary btn-sm btn-icon" type="button" onclick="AppointmentPage.editAppointment('${appointment.id}')">Edit</button><button class="btn btn-danger btn-sm btn-icon" type="button" onclick="AppointmentPage.deleteAppointment('${appointment.id}')">Delete</button></div></td>
      </tr>
    `).join('');
  }

  function applyFilters() {
    const search = document.getElementById('globalSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    let list = [...state.appointments];

    if (status) list = list.filter((item) => item.status === status);
    if (type) list = list.filter((item) => item.type === type);
    if (search) {
      list = list.filter((item) => {
        return [item.patient_name, item.doctor_name, item.type].some((value) => value && value.toLowerCase().includes(search));
      });
    }

    renderAppointments(list);
  }

  async function loadAppointments() {
    try {
      state.appointments = await window.db.getAppointments();
      applyFilters();
      updateStats();
    } catch (error) {
      console.error('Error loading appointments:', error);
      showToast('error', 'Could not load appointments', error.message || '');
    }
  }

  async function saveAppointment(event) {
    event.preventDefault();
    const form = document.getElementById('appointmentForm');
    if (!validateForm(form)) {
      showToast('warning', 'Validation failed', 'Please complete required fields.');
      return;
    }

    const appointment = getFormData();
    try {
      if (state.editingId) {
        const result = await window.db.updateAppointment(state.editingId, appointment);
        if (!result.success) throw new Error(result.error || 'Update failed');
        showToast('success', 'Appointment updated', 'Record updated successfully.');
      } else {
        const result = await window.db.createAppointment(appointment);
        if (!result.success) throw new Error(result.error || 'Save failed');
        showToast('success', 'Appointment saved', 'Record created successfully.');
      }
      clearForm();
      await loadAppointments();
    } catch (error) {
      console.error('Save appointment error:', error);
      showToast('error', 'Could not save appointment', error.message || '');
    }
  }

  function clearForm() {
    const form = document.getElementById('appointmentForm');
    if (form) form.reset();
    state.editingId = null;
    document.getElementById('formTitle').textContent = 'New Appointment';
    document.getElementById('submitBtn').textContent = 'Save Appointment';
    clearValidation(form);
  }

  function editAppointment(id) {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment) return;

    state.editingId = id;
    document.getElementById('formTitle').textContent = 'Edit Appointment';
    document.getElementById('submitBtn').textContent = 'Update Appointment';
    document.getElementById('patientName').value = appointment.patient_name || '';
    document.getElementById('patientId').value = appointment.patient_id || '';
    document.getElementById('doctorName').value = appointment.doctor_name || '';
    document.getElementById('appointmentDate').value = appointment.date || '';
    document.getElementById('appointmentTime').value = appointment.time || '';
    document.getElementById('appointmentType').value = appointment.type || '';
    document.getElementById('appointmentStatus').value = appointment.status || 'Scheduled';
    document.getElementById('formPanel')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteAppointment(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
      const result = await window.db.deleteAppointment(id);
      if (!result.success) throw new Error(result.error || 'Delete failed');
      showToast('success', 'Appointment deleted', 'Record removed successfully.');
      await loadAppointments();
    } catch (error) {
      console.error('Delete appointment error:', error);
      showToast('error', 'Could not delete appointment', error.message || '');
    }
  }

  function updateStats() {
    const totalEl = document.getElementById('statTotal');
    const upcomingEl = document.getElementById('statUpcoming');
    const todayEl = document.getElementById('statTodayApt');
    const completedEl = document.getElementById('statCompleted');
    const compRateEl = document.getElementById('statCompRate');

    const completedCount = state.appointments.filter((a) => (a.status || '').toLowerCase() === 'completed').length;
    const scheduledCount = state.appointments.filter((a) => (a.status || '').toLowerCase() === 'scheduled').length;
    const todayCount = state.appointments.filter((a) => a.date === new Date().toISOString().split('T')[0]).length;

    if (totalEl) totalEl.textContent = state.appointments.length;
    if (upcomingEl) upcomingEl.textContent = scheduledCount;
    if (todayEl) todayEl.textContent = `${todayCount} today`;
    if (completedEl) completedEl.textContent = completedCount;
    if (compRateEl) compRateEl.textContent = state.appointments.length ? `${Math.round((completedCount / state.appointments.length) * 100)}%` : '—';
  }

  function showToast(type, title, message) {
    if (typeof Toast !== 'undefined') Toast[type](title, message);
    else alert(`${title}: ${message}`);
  }

  function attachEvents() {
    document.getElementById('appointmentForm')?.addEventListener('submit', saveAppointment);
    document.querySelector('.btn-secondary[onclick="clearForm()"]')?.addEventListener('click', clearForm);
    document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
    document.getElementById('filterType')?.addEventListener('change', applyFilters);
    document.getElementById('globalSearch')?.addEventListener('input', applyFilters);
    document.querySelector('.btn-secondary[onclick="clearFilters()"]')?.addEventListener('click', () => {
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterType').value = '';
      document.getElementById('globalSearch').value = '';
      applyFilters();
    });
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const csv = Exporter.toCSV(state.appointments);
      Exporter.download(`appointments_${new Date().toISOString().split('T')[0]}.csv`, csv, 'text/csv');
      showToast('success', 'Export completed', 'Appointments saved as CSV');
    });
  }

  async function init() {
    if (window.db && typeof window.db.testConnection === 'function') {
      const status = await window.db.testConnection();
      if (typeof updateDBStatus === 'function') updateDBStatus(status.success);
    }

    window.clearForm = clearForm;
    attachEvents();
    await loadAppointments();
  }

  window.AppointmentPage = {
    editAppointment,
    deleteAppointment
  };

  document.addEventListener('DOMContentLoaded', init);
})();
