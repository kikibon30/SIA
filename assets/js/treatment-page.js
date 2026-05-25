const TreatmentPage = (() => {
  const state = {
    treatments: [],
    patients: [],
    doctors: [
      { id: 'd1', name: 'Dr. Smith' },
      { id: 'd2', name: 'Dr. Adams' },
      { id: 'd3', name: 'Dr. Williams' }
    ],
    nurses: [
      { id: 'n1', name: 'Nurse Anna' },
      { id: 'n2', name: 'Nurse Brian' },
      { id: 'n3', name: 'Nurse Claire' }
    ],
    editingId: null
  };

  function statusBadge(status) {
    const normalized = (status || 'Pending').toString().toLowerCase();
    const map = {
      completed: 'badge-completed',
      ongoing: 'badge-scheduled',
      pending: 'badge-pending',
      'on hold': 'badge-pending',
      cancelled: 'badge-cancelled'
    };
    return `<span class="badge ${map[normalized] || 'badge-pending'}">${status || 'Pending'}</span>`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function loadPatients() {
    try {
      state.patients = await window.db.getPatients();
    } catch (error) {
      console.error('Could not load patients:', error);
      state.patients = [];
    }
    const select = document.getElementById('patientSelect');
    if (!select) return;
    select.innerHTML = '<option value="">— Select Patient —</option>' + state.patients.map((p) => {
      const display = p.full_name || p.name || (p.patient_code ? `${p.patient_code}` : (p.id || 'Unnamed'));
      return ` <option value="${p.id}" data-pid="${p.patient_code || ''}">${display}</option>`;
    }).join('');
  }

  function loadStaff() {
    const doctorSelect = document.getElementById('trtDoctor');
    const nurseSelect = document.getElementById('trtNurse');
    if (doctorSelect) {
      doctorSelect.innerHTML = '<option value="">— Select Doctor —</option>' + state.doctors.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    if (nurseSelect) {
      nurseSelect.innerHTML = state.nurses.map((n) => `<option value="${n.id}">${n.name}</option>`).join('');
    }
  }

  async function loadTreatments() {
    try {
      state.treatments = await window.db.getTreatments();
      renderTreatments();
      updateStats();
    } catch (error) {
      console.error('Could not load treatments:', error);
      showToast('error', 'Unable to load treatments', error.message || '');
    }
  }

  function renderTreatments(filtered = null) {
    const rows = (filtered || state.treatments || []).map((t) => {
      const nurseNames = Array.isArray(t.nurses) ? t.nurses.map((id) => state.nurses.find((n) => n.id === id)?.name || id).join(', ') : (t.nurses || '—');
      return `
        <tr>
          <td><div class="table-name-cell"><div class="table-avatar">${Format.initials(t.patient_name)}</div><div><div class="table-name-primary">${t.patient_name || '—'}</div><div class="table-name-secondary">${t.patient_id || '—'}</div></div></div></td>
          <td><div class="table-name-primary">${t.diagnosis || '—'}</div><div class="table-name-secondary text-muted">${(t.description || '').slice(0, 40)}${(t.description || '').length > 40 ? '…' : ''}</div></td>
          <td><span class="badge badge-active">${t.type || '—'}</span></td>
          <td>${t.doctor_name || '—'}</td>
          <td><span class="text-sm text-muted">${nurseNames || '—'}</span></td>
          <td>${formatDate(t.date)}</td>
          <td>${statusBadge(t.status)}</td>
          <td style="text-align:right;"><div class="table-actions"><button class="btn btn-secondary btn-sm btn-icon" type="button" onclick="TreatmentPage.editTreatment('${t.id}')">Edit</button><button class="btn btn-danger btn-sm btn-icon" type="button" onclick="TreatmentPage.deleteTreatment('${t.id}')">Delete</button></div></td>
        </tr>
      `;
    });
    const tbody = document.getElementById('trtTableBody');
    const counter = document.getElementById('tableCount');
    if (!tbody || !counter) return;
    const list = filtered || state.treatments;
    counter.textContent = `${list.length} record${list.length !== 1 ? 's' : ''}`;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No treatments found</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.join('');
  }

  function applyFilters() {
    const search = document.getElementById('globalSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    let list = [...state.treatments];
    if (status) list = list.filter((item) => item.status === status);
    if (type) list = list.filter((item) => item.type === type);
    if (search) {
      list = list.filter((item) => {
        return [item.patient_name, item.diagnosis, item.description, item.doctor_name].some((value) => value && value.toLowerCase().includes(search));
      });
    }
    renderTreatments(list);
  }

  function updateStats() {
    document.getElementById('sTotalTrt').textContent = state.treatments.length;
    document.getElementById('sOngoing').textContent = state.treatments.filter((t) => t.status === 'Ongoing').length;
    document.getElementById('sCompleted').textContent = state.treatments.filter((t) => t.status === 'Completed').length;
    document.getElementById('sPending').textContent = state.treatments.filter((t) => t.status === 'Pending').length;
  }

  function getFormData() {
    const selectedPatient = document.getElementById('patientSelect');
    const selectedDoctor = document.getElementById('trtDoctor');
    return {
      patient_name: selectedPatient?.selectedOptions[0]?.text || '',
      patient_id: selectedPatient?.value || null,
      diagnosis: document.getElementById('trtDiagnosis').value.trim(),
      type: document.getElementById('trtType').value,
      description: document.getElementById('trtDesc').value.trim(),
      procedure: document.getElementById('trtProcedure').value.trim(),
      doctor_name: selectedDoctor?.selectedOptions[0]?.text || '',
      doctor_id: selectedDoctor?.value || null,
      nurses: Array.from(document.getElementById('trtNurse').selectedOptions).map((opt) => opt.value),
      date: document.getElementById('trtDate').value,
      status: document.getElementById('trtStatus').value,
      notes: ''
    };
  }

  async function saveTreatment(event) {
    event.preventDefault();
    const form = document.getElementById('treatmentForm');
    if (!validateForm(form)) {
      showToast('warning', 'Validation failed', 'Please fill the required fields.');
      return;
    }
    const payload = getFormData();
    try {
      if (state.editingId) {
        const result = await window.db.updateTreatment(state.editingId, payload);
        if (!result.success) throw new Error(result.error || 'Update failed');
        showToast('success', 'Treatment updated', 'Record updated successfully.');
      } else {
        const result = await window.db.createTreatment(payload);
        if (!result.success) throw new Error(result.error || 'Save failed');
        showToast('success', 'Treatment saved', 'Record created successfully.');
      }
      clearForm();
      await loadTreatments();
    } catch (error) {
      console.error('Save treatment error:', error);
      showToast('error', 'Could not save treatment', error.message || '');
    }
  }

  function clearForm() {
    const form = document.getElementById('treatmentForm');
    if (form) form.reset();
    state.editingId = null;
    document.getElementById('formTitle').textContent = 'New Treatment';
    document.getElementById('submitBtn').textContent = 'Save Treatment';
    document.getElementById('trtStatus').value = 'Pending';
    clearValidation(form);
  }

  function editTreatment(id) {
    const treatment = state.treatments.find((item) => item.id === id);
    if (!treatment) return;
    state.editingId = id;
    document.getElementById('formTitle').textContent = 'Edit Treatment';
    document.getElementById('submitBtn').textContent = 'Update Treatment';
    document.getElementById('patientSelect').value = treatment.patient_id || '';
    document.getElementById('patientId').value = treatment.patient_id || '';
    document.getElementById('trtDiagnosis').value = treatment.diagnosis || '';
    document.getElementById('trtType').value = treatment.type || 'Medication';
    document.getElementById('trtDesc').value = treatment.description || '';
    document.getElementById('trtProcedure').value = treatment.procedure || '';
    document.getElementById('trtDoctor').value = treatment.doctor_id || '';
    document.getElementById('trtDate').value = treatment.date || '';
    document.getElementById('trtStatus').value = treatment.status || 'Pending';
    const nurseSelect = document.getElementById('trtNurse');
    if (nurseSelect && Array.isArray(treatment.nurses)) {
      Array.from(nurseSelect.options).forEach((opt) => { opt.selected = treatment.nurses.includes(opt.value); });
    }
    document.getElementById('formPanel')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteTreatment(id) {
    if (!confirm('Delete this treatment record?')) return;
    try {
      const result = await window.db.deleteTreatment(id);
      if (!result.success) throw new Error(result.error || 'Delete failed');
      showToast('success', 'Treatment removed', 'Record deleted successfully.');
      await loadTreatments();
    } catch (error) {
      console.error('Delete treatment error:', error);
      showToast('error', 'Could not delete treatment', error.message || '');
    }
  }

  function attachEvents() {
    document.getElementById('treatmentForm')?.addEventListener('submit', saveTreatment);
    document.getElementById('patientSelect')?.addEventListener('change', (event) => {
      document.getElementById('patientId').value = event.target.selectedOptions[0]?.dataset?.pid || '';
    });
    ['filterStatus', 'filterType'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('globalSearch')?.addEventListener('input', applyFilters);
    document.querySelector('.btn-secondary[onclick="clearFilters()"]')?.addEventListener('click', () => {
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterType').value = '';
      document.getElementById('globalSearch').value = '';
      applyFilters();
    });
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const csv = Exporter.toCSV(state.treatments.map((item) => ({
        id: item.id,
        patient_name: item.patient_name,
        diagnosis: item.diagnosis,
        type: item.type,
        doctor_name: item.doctor_name,
        date: item.date,
        status: item.status
      })));
      Exporter.download(`treatments_${new Date().toISOString().split('T')[0]}.csv`, csv, 'text/csv');
      showToast('success', 'Export completed', 'Treatments saved as CSV.');
    });
  }

  function showToast(type, title, message) {
    if (typeof Toast !== 'undefined') Toast[type](title, message);
    else alert(`${title}: ${message}`);
  }

  async function init() {
    if (window.db && typeof window.db.testConnection === 'function') {
      const status = await window.db.testConnection();
      if (typeof updateDBStatus === 'function') updateDBStatus(status.success);
    }
    loadStaff();
    await loadPatients();
    await loadTreatments();
    attachEvents();
  }

  window.TreatmentPage = {
    editTreatment,
    deleteTreatment
  };

  document.addEventListener('DOMContentLoaded', init);
})();
