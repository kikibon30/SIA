// ============================================
// APPOINTMENTS & TREATMENT MODULE
// Integrated with Supabase backend
// ============================================

// Global State
let appointments = [];
let treatments = [];
let patients = [];
let staffMembers = [];
let editingAppointmentId = null;
let editingTreatmentId = null;
let searchAppointmentTerm = '';
let searchTreatmentTerm = '';
let searchHistoryTerm = '';

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadPatients() {
    try {
        patients = await getAllPatients();
        populatePatientDropdowns();
    } catch (error) {
        console.error('Error loading patients:', error);
        showNotification('Could not load patients', 'error');
    }
}

async function loadStaff() {
    try {
        staffMembers = await getAllStaff();
        // Filter only doctors and nurses for staff dropdowns
        const medicalStaff = staffMembers.filter(s => 
            s.position === 'Doctor' || s.position === 'Nurse' || 
            s.position === 'Senior Doctor' || s.position === 'Senior Nurse' ||
            s.position === 'Consultant' || s.position === 'Surgeon'
        );
        populateStaffDropdowns(medicalStaff);
    } catch (error) {
        console.error('Error loading staff:', error);
        showNotification('Could not load staff', 'error');
    }
}

async function loadAppointments() {
    try {
        const data = await getAllRecords('appointment');
        appointments = data || [];
        renderAppointmentsTable();
        updateSummaryStats();
    } catch (error) {
        console.error('Error loading appointments:', error);
        showNotification('Could not load appointments', 'error');
    }
}

async function loadTreatments() {
    try {
        const data = await getAllRecords('treatment');
        treatments = data || [];
        renderTreatmentsTable();
        renderHistoryTable();
        updateSummaryStats();
    } catch (error) {
        console.error('Error loading treatments:', error);
        showNotification('Could not load treatments', 'error');
    }
}

// ============================================
// CRUD OPERATIONS
// ============================================

async function saveAppointment(appointmentData, isUpdate = false, id = null) {
    try {
        if (isUpdate && id) {
            const updated = await updateRecord('appointment', id, {
                patient_id: appointmentData.patient_id,
                staff_id: appointmentData.staff_id,
                appointment_date: appointmentData.appointment_date,
                appointment_time: appointmentData.appointment_time,
                reason: appointmentData.reason,
                status: appointmentData.status,
                updated_at: new Date().toISOString()
            });
            if (updated) {
                const index = appointments.findIndex(a => a.appointment_id === id);
                if (index !== -1) appointments[index] = updated;
                return true;
            }
        } else {
            const nextId = await getNextNumericId('appointment', 'appointment_id');
            const newAppointment = {
                appointment_id: nextId,
                patient_id: appointmentData.patient_id,
                staff_id: appointmentData.staff_id,
                appointment_date: appointmentData.appointment_date,
                appointment_time: appointmentData.appointment_time,
                reason: appointmentData.reason,
                status: appointmentData.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const created = await insertRecord('appointment', newAppointment);
            if (created) {
                appointments.unshift(created);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error saving appointment:', error);
        return false;
    }
}

async function deleteAppointment(id) {
    try {
        const success = await deleteRecord('appointment', id);
        if (success) {
            appointments = appointments.filter(a => a.appointment_id !== id);
            renderAppointmentsTable();
            updateSummaryStats();
            showNotification('Appointment deleted successfully', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification('Could not delete appointment', 'error');
        return false;
    }
}

async function saveTreatment(treatmentData, isUpdate = false, id = null) {
    try {
        if (isUpdate && id) {
            const updated = await updateRecord('treatment', id, {
                patient_id: treatmentData.patient_id,
                staff_id: treatmentData.staff_id,
                diagnosis: treatmentData.diagnosis,
                treatment_description: treatmentData.treatment_description,
                treatment_date: treatmentData.treatment_date,
                follow_up_date: treatmentData.follow_up_date,
                medications: treatmentData.medications,
                notes: treatmentData.notes,
                updated_at: new Date().toISOString()
            });
            if (updated) {
                const index = treatments.findIndex(t => t.treatment_id === id);
                if (index !== -1) treatments[index] = updated;
                return true;
            }
        } else {
            const nextId = await getNextNumericId('treatment', 'treatment_id');
            const newTreatment = {
                treatment_id: nextId,
                patient_id: treatmentData.patient_id,
                staff_id: treatmentData.staff_id,
                diagnosis: treatmentData.diagnosis,
                treatment_description: treatmentData.treatment_description,
                treatment_date: treatmentData.treatment_date,
                follow_up_date: treatmentData.follow_up_date,
                medications: treatmentData.medications,
                notes: treatmentData.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const created = await insertRecord('treatment', newTreatment);
            if (created) {
                treatments.unshift(created);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error saving treatment:', error);
        return false;
    }
}

async function deleteTreatment(id) {
    try {
        const success = await deleteRecord('treatment', id);
        if (success) {
            treatments = treatments.filter(t => t.treatment_id !== id);
            renderTreatmentsTable();
            renderHistoryTable();
            updateSummaryStats();
            showNotification('Treatment deleted successfully', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting treatment:', error);
        showNotification('Could not delete treatment', 'error');
        return false;
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAppointmentsTable() {
    const tbody = document.getElementById('appointmentsTable');
    if (!tbody) return;
    
    let filtered = appointments;
    if (searchAppointmentTerm) {
        const term = searchAppointmentTerm.toLowerCase();
        filtered = appointments.filter(a => {
            const patient = patients.find(p => p.patient_id === a.patient_id);
            const staff = staffMembers.find(s => s.staff_id === a.staff_id);
            const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
            const staffName = staff ? `${staff.first_name} ${staff.last_name}`.toLowerCase() : '';
            return patientName.includes(term) || staffName.includes(term);
        });
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No appointments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filtered.forEach(appointment => {
        const row = tbody.insertRow();
        const patient = patients.find(p => p.patient_id === appointment.patient_id);
        const staff = staffMembers.find(s => s.staff_id === appointment.staff_id);
        const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown';
        
        let statusClass = '';
        switch(appointment.status) {
            case 'Scheduled': statusClass = 'status-scheduled'; break;
            case 'Confirmed': statusClass = 'status-confirmed'; break;
            case 'Completed': statusClass = 'status-completed'; break;
            case 'Cancelled': statusClass = 'status-cancelled'; break;
            default: statusClass = 'status-no-show';
        }
        
        row.insertCell(0).innerText = appointment.appointment_date || '-';
        row.insertCell(1).innerText = appointment.appointment_time || '-';
        row.insertCell(2).innerHTML = `<strong>${escapeHtml(patientName)}</strong>`;
        row.insertCell(3).innerText = staffName;
        row.insertCell(4).innerText = appointment.reason || '-';
        row.insertCell(5).innerHTML = `<span class="status-badge ${statusClass}">${appointment.status || 'Scheduled'}</span>`;
        
        const actionsCell = row.insertCell(6);
        actionsCell.innerHTML = `
            <span class="action-edit" data-id="${appointment.appointment_id}">Edit</span>
            <span class="action-delete" data-id="${appointment.appointment_id}">Delete</span>
        `;
    });
    
    document.querySelectorAll('#appointmentsTable .action-edit').forEach(btn => {
        btn.addEventListener('click', () => editAppointment(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('#appointmentsTable .action-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this appointment?')) deleteAppointment(parseInt(btn.dataset.id));
        });
    });
}

function renderTreatmentsTable() {
    const tbody = document.getElementById('treatmentsTable');
    if (!tbody) return;
    
    let filtered = treatments;
    if (searchTreatmentTerm) {
        const term = searchTreatmentTerm.toLowerCase();
        filtered = treatments.filter(t => {
            const patient = patients.find(p => p.patient_id === t.patient_id);
            const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
            return patientName.includes(term);
        });
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No treatments recorded</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filtered.slice(0, 20).forEach(treatment => {
        const row = tbody.insertRow();
        const patient = patients.find(p => p.patient_id === treatment.patient_id);
        const staff = staffMembers.find(s => s.staff_id === treatment.staff_id);
        const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown';
        
        row.insertCell(0).innerText = treatment.treatment_date || '-';
        row.insertCell(1).innerHTML = `<strong>${escapeHtml(patientName)}</strong>`;
        row.insertCell(2).innerText = staffName;
        row.insertCell(3).innerText = treatment.diagnosis || '-';
        row.insertCell(4).innerText = (treatment.treatment_description || '').substring(0, 50) + (treatment.treatment_description?.length > 50 ? '...' : '');
        
        const actionsCell = row.insertCell(5);
        actionsCell.innerHTML = `
            <span class="action-edit" data-id="${treatment.treatment_id}">Edit</span>
            <span class="action-delete" data-id="${treatment.treatment_id}">Delete</span>
        `;
    });
    
    document.querySelectorAll('#treatmentsTable .action-edit').forEach(btn => {
        btn.addEventListener('click', () => editTreatment(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('#treatmentsTable .action-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this treatment record?')) deleteTreatment(parseInt(btn.dataset.id));
        });
    });
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTable');
    if (!tbody) return;
    
    let filtered = treatments;
    if (searchHistoryTerm) {
        const term = searchHistoryTerm.toLowerCase();
        filtered = treatments.filter(t => {
            const patient = patients.find(p => p.patient_id === t.patient_id);
            const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
            return patientName.includes(term);
        });
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No treatment history found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filtered.sort((a, b) => new Date(b.treatment_date) - new Date(a.treatment_date)).forEach(treatment => {
        const row = tbody.insertRow();
        const patient = patients.find(p => p.patient_id === treatment.patient_id);
        const staff = staffMembers.find(s => s.staff_id === treatment.staff_id);
        const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown';
        
        row.insertCell(0).innerText = treatment.treatment_date || '-';
        row.insertCell(1).innerHTML = `<strong>${escapeHtml(patientName)}</strong>`;
        row.insertCell(2).innerText = patient?.patient_id || '-';
        row.insertCell(3).innerText = staffName;
        row.insertCell(4).innerText = treatment.diagnosis || '-';
        row.insertCell(5).innerText = (treatment.treatment_description || '').substring(0, 60) + (treatment.treatment_description?.length > 60 ? '...' : '');
        row.insertCell(6).innerText = treatment.follow_up_date || '-';
    });
}

function editAppointment(id) {
    const appointment = appointments.find(a => a.appointment_id === id);
    if (!appointment) return;
    
    editingAppointmentId = appointment.appointment_id;
    document.getElementById('appointmentId').value = appointment.appointment_id;
    document.getElementById('appointmentPatient').value = appointment.patient_id;
    document.getElementById('appointmentDoctor').value = appointment.staff_id;
    document.getElementById('appointmentDate').value = appointment.appointment_date;
    document.getElementById('appointmentTime').value = appointment.appointment_time;
    document.getElementById('appointmentReason').value = appointment.reason || '';
    document.getElementById('appointmentStatus').value = appointment.status || 'Scheduled';
    
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
    showNotification('Edit mode: Update appointment details', 'info');
}

function editTreatment(id) {
    const treatment = treatments.find(t => t.treatment_id === id);
    if (!treatment) return;
    
    editingTreatmentId = treatment.treatment_id;
    document.getElementById('treatmentId').value = treatment.treatment_id;
    document.getElementById('treatmentPatient').value = treatment.patient_id;
    document.getElementById('treatmentStaff').value = treatment.staff_id;
    document.getElementById('treatmentDiagnosis').value = treatment.diagnosis || '';
    document.getElementById('treatmentDescription').value = treatment.treatment_description || '';
    document.getElementById('treatmentDate').value = treatment.treatment_date;
    document.getElementById('followUpDate').value = treatment.follow_up_date || '';
    document.getElementById('treatmentMedications').value = treatment.medications || '';
    document.getElementById('treatmentNotes').value = treatment.notes || '';
    
    document.querySelectorAll('.card')[2].scrollIntoView({ behavior: 'smooth' });
    showNotification('Edit mode: Update treatment record', 'info');
}

function updateSummaryStats() {
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const pending = appointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
    const totalTreatments = treatments.length;
    
    const totalElem = document.getElementById('totalAppointments');
    const completedElem = document.getElementById('completedAppointments');
    const pendingElem = document.getElementById('pendingAppointments');
    const treatmentsElem = document.getElementById('totalTreatments');
    
    if (totalElem) totalElem.innerText = total;
    if (completedElem) completedElem.innerText = completed;
    if (pendingElem) pendingElem.innerText = pending;
    if (treatmentsElem) treatmentsElem.innerText = totalTreatments;
}

// ============================================
// DROPDOWN POPULATORS
// ============================================

function populatePatientDropdowns() {
    const selects = ['appointmentPatient', 'treatmentPatient'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">-- Select Patient --</option>';
            patients.forEach(patient => {
                const name = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                select.innerHTML += `<option value="${patient.patient_id}">${escapeHtml(name)} (ID: ${patient.patient_id})</option>`;
            });
        }
    });
}

function populateStaffDropdowns(medicalStaff) {
    const selects = ['appointmentDoctor', 'treatmentStaff'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">-- Select Staff --</option>';
            medicalStaff.forEach(staff => {
                const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
                select.innerHTML += `<option value="${staff.staff_id}">${escapeHtml(name)} (${staff.position || 'Staff'})</option>`;
            });
        }
    });
}

// ============================================
// FORM HANDLERS
// ============================================

document.getElementById('appointmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const appointmentData = {
        patient_id: parseInt(document.getElementById('appointmentPatient').value),
        staff_id: parseInt(document.getElementById('appointmentDoctor').value),
        appointment_date: document.getElementById('appointmentDate').value,
        appointment_time: document.getElementById('appointmentTime').value,
        reason: document.getElementById('appointmentReason').value,
        status: document.getElementById('appointmentStatus').value
    };
    
    if (!appointmentData.patient_id || !appointmentData.staff_id || !appointmentData.appointment_date) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    const success = await saveAppointment(appointmentData, !!editingAppointmentId, editingAppointmentId);
    
    if (success) {
        showNotification(editingAppointmentId ? 'Appointment updated' : 'Appointment scheduled', 'success');
        document.getElementById('appointmentForm').reset();
        editingAppointmentId = null;
        await loadAppointments();
    } else {
        showNotification('Could not save appointment', 'error');
    }
});

document.getElementById('treatmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const treatmentData = {
        patient_id: parseInt(document.getElementById('treatmentPatient').value),
        staff_id: parseInt(document.getElementById('treatmentStaff').value),
        diagnosis: document.getElementById('treatmentDiagnosis').value,
        treatment_description: document.getElementById('treatmentDescription').value,
        treatment_date: document.getElementById('treatmentDate').value,
        follow_up_date: document.getElementById('followUpDate').value || null,
        medications: document.getElementById('treatmentMedications').value,
        notes: document.getElementById('treatmentNotes').value
    };
    
    if (!treatmentData.patient_id || !treatmentData.staff_id || !treatmentData.treatment_description || !treatmentData.treatment_date) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    const success = await saveTreatment(treatmentData, !!editingTreatmentId, editingTreatmentId);
    
    if (success) {
        showNotification(editingTreatmentId ? 'Treatment updated' : 'Treatment recorded', 'success');
        document.getElementById('treatmentForm').reset();
        editingTreatmentId = null;
        await loadTreatments();
    } else {
        showNotification('Could not save treatment', 'error');
    }
});

document.getElementById('clearAppointmentBtn')?.addEventListener('click', () => {
    document.getElementById('appointmentForm').reset();
    editingAppointmentId = null;
    showNotification('Form cleared', 'info');
});

document.getElementById('clearTreatmentBtn')?.addEventListener('click', () => {
    document.getElementById('treatmentForm').reset();
    editingTreatmentId = null;
    showNotification('Form cleared', 'info');
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

document.getElementById('searchAppointment')?.addEventListener('input', (e) => {
    searchAppointmentTerm = e.target.value;
    renderAppointmentsTable();
});

document.getElementById('searchTreatment')?.addEventListener('input', (e) => {
    searchTreatmentTerm = e.target.value;
    renderTreatmentsTable();
});

document.getElementById('searchHistory')?.addEventListener('input', (e) => {
    searchHistoryTerm = e.target.value;
    renderHistoryTable();
});

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    const activeContent = document.getElementById(`${tabName}Tab`);
    if (activeContent) activeContent.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${escapeHtml(message)}`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
        border-radius: 12px; background: ${type === 'success' ? '#15803d' : type === 'error' ? '#b91c1c' : '#287b9e'};
        color: white; z-index: 1000; font-size: 0.85rem; cursor: pointer;
    `;
    notification.addEventListener('click', () => notification.remove());
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    await loadPatients();
    await loadStaff();
    await loadAppointments();
    await loadTreatments();
    switchTab('appointments');
});

console.log('Appointments & Treatment Module Initialized');