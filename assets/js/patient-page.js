const PatientPage = (() => {
  const state = {
    patients: [],
    editingId: null
  };

  function setDBStatus(connected, message) {
    if (typeof updateDBStatus === 'function') updateDBStatus(connected);
    const text = document.querySelector('.db-status-text');
    if (text) text.textContent = connected ? (message || 'Supabase Connected') : (message || 'Connection Failed');
  }

  function getFormData() {
    return {
      full_name: document.getElementById('fullName').value.trim(),
      patient_code: document.getElementById('patientCode').value.trim(),
      dob: document.getElementById('dob').value || null,
      gender: document.getElementById('gender').value || null,
      phone: document.getElementById('phone').value.trim() || null,
      email: document.getElementById('email').value.trim() || null,
      address: document.getElementById('address').value.trim() || null,
      status: document.getElementById('status').value || 'Active'
    };
  }

  function renderPatientsTable(list) {
    const tbody = document.getElementById('patientTableBody');
    const count = document.getElementById('tableCount');
    if (!tbody || !count) return;
    count.textContent = `${list.length} patient${list.length !== 1 ? 's' : ''}`;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No patients found</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map((p) => `
      <tr>
        <td><strong>${p.patient_code || '—'}</strong></td>
        <td>${p.full_name || '—'}</td>
        <td>${p.phone || '—'}</td>
        <td>${p.email || '—'}</td>
        <td><span class="badge ${p.status === 'Active' ? 'badge-completed' : 'badge-cancelled'}">${p.status || 'Unknown'}</span></td>
        <td style="text-align:right;"><div class="table-actions"><button class="btn btn-secondary btn-sm btn-icon" type="button" onclick="PatientPage.editPatient('${p.id}')">Edit</button><button class="btn btn-danger btn-sm btn-icon" type="button" onclick="PatientPage.deletePatient('${p.id}')">Delete</button></div></td>
      </tr>
    `).join('');
  }

  function applyFilters() {
    const search = document.getElementById('globalSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    let list = [...state.patients];
    if (status) list = list.filter((p) => p.status === status);
    if (search) {
      list = list.filter((p) => {
        return [p.full_name, p.patient_code, p.phone, p.email].some((value) => value && value.toLowerCase().includes(search));
      });
    }
    renderPatientsTable(list);
  }

  function updateStats() {
    document.getElementById('statTotal').textContent = state.patients.length;
    document.getElementById('statActive').textContent = state.patients.filter((p) => p.status === 'Active').length;
  }

  async function loadPatients() {
    try {
      state.patients = await window.db.getPatients();
      applyFilters();
      updateStats();
    } catch (error) {
      console.error('Failed to load patients:', error);
      showToast('error', 'Could not load patients', error.message || '');
    }
  }

  async function savePatient(event) {
    event.preventDefault();
    const form = document.getElementById('patientForm');
    if (!validateForm(form)) {
      showToast('warning', 'Validation failed', 'Please fill the required fields.');
      return;
    }
    const patient = getFormData();
    try {
      if (state.editingId) {
        const result = await window.db.updatePatient(state.editingId, patient);
        if (!result.success) throw new Error(result.error || 'Update failed');
        showToast('success', 'Patient updated', 'Record updated successfully.');
      } else {
        const result = await window.db.createPatient(patient);
        if (!result.success) throw new Error(result.error || 'Create failed');
        showToast('success', 'Patient saved', 'Record created successfully.');
      }
      clearForm();
      await loadPatients();
    } catch (error) {
      console.error('Save patient error:', error);
      showToast('error', 'Save failed', error.message || 'Unable to save patient.');
    }
  }

  function clearForm() {
    const form = document.getElementById('patientForm');
    if (form) form.reset();
    state.editingId = null;
    document.getElementById('formTitle').textContent = 'New Patient';
    document.getElementById('submitBtn').textContent = 'Save Patient';
    clearValidation(form);
  }

  async function editPatient(id) {
    const patient = state.patients.find((p) => p.id === id);
    if (!patient) return;
    state.editingId = id;
    document.getElementById('formTitle').textContent = 'Edit Patient';
    document.getElementById('submitBtn').textContent = 'Update Patient';
    document.getElementById('patientId').value = patient.id;
    document.getElementById('fullName').value = patient.full_name || '';
    document.getElementById('patientCode').value = patient.patient_code || '';
    document.getElementById('dob').value = patient.dob || '';
    document.getElementById('gender').value = patient.gender || '';
    document.getElementById('phone').value = patient.phone || '';
    document.getElementById('email').value = patient.email || '';
    document.getElementById('address').value = patient.address || '';
    document.getElementById('status').value = patient.status || 'Active';
    document.getElementById('formPanel')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deletePatient(id) {
    const confirmed = confirm('Delete this patient record? This cannot be undone.');
    if (!confirmed) return;
    try {
      const result = await window.db.deletePatient(id);
      if (!result.success) throw new Error(result.error || 'Delete failed');
      showToast('success', 'Patient removed', 'Record deleted successfully.');
      if (state.editingId === id) clearForm();
      await loadPatients();
    } catch (error) {
      console.error('Delete patient error:', error);
      showToast('error', 'Could not delete', error.message || 'Delete failed.');
    }
  }

  function showToast(type, title, message) {
    if (typeof Toast !== 'undefined') Toast[type](title, message);
    else alert(`${title}: ${message}`);
  }

  function attachEvents() {
    document.getElementById('patientForm')?.addEventListener('submit', savePatient);
    document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
    document.getElementById('globalSearch')?.addEventListener('input', applyFilters);
    document.querySelector('.btn-secondary[onclick="clearFilters()"]')?.addEventListener('click', () => {
      document.getElementById('filterStatus').value = '';
      document.getElementById('globalSearch').value = '';
      applyFilters();
    });
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const csv = Exporter.toCSV(state.patients);
      Exporter.download(`patients_${new Date().toISOString().split('T')[0]}.csv`, csv, 'text/csv');
      showToast('success', 'Export completed', 'Patients exported as CSV.');
    });
  }

  async function init() {
    if (window.db && typeof window.db.testConnection === 'function') {
      const status = await window.db.testConnection();
      setDBStatus(status.success, status.message);
    }
    attachEvents();
    await loadPatients();
  }

  window.PatientPage = {
    editPatient,
    deletePatient
  };

  document.addEventListener('DOMContentLoaded', init);
})();
