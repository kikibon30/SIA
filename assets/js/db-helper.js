/**
 * db-helper.js
 * AppointmentDB — handles all Supabase CRUD operations with
 * localStorage fallback when Supabase is not configured.
 * Emits SIABus events on every mutation for cross-page reactivity.
 */

class AppointmentDB {
  constructor(client) {
    this.client = client;
    this._realtimeChannel = null;
  }

  /* ─────────────────────────────────────────
     REAL-TIME SUBSCRIPTIONS
     ───────────────────────────────────────── */
  subscribeToAll(onChange) {
    if (!this.client) return;

    this._realtimeChannel = this.client
      .channel('sia-realtime')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'appointments' },
          (payload) => {
            onChange({ source: 'appointments', ...payload });
            SIABus.emit(`appointment:${payload.eventType.toLowerCase()}`, payload.new || payload.old);
          })
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'treatments' },
          (payload) => {
            onChange({ source: 'treatments', ...payload });
            SIABus.emit(`treatment:${payload.eventType.toLowerCase()}`, payload.new || payload.old);
          })
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'patients' },
          (payload) => {
            onChange({ source: 'patients', ...payload });
          })
      .subscribe((status) => {
        console.log('[Supabase] Realtime status:', status);
      });
  }

  unsubscribe() {
    if (this._realtimeChannel) {
      this.client.removeChannel(this._realtimeChannel);
      this._realtimeChannel = null;
    }
  }

  /* ─────────────────────────────────────────
     APPOINTMENTS
     ───────────────────────────────────────── */
  async getAppointments(filters = {}) {
    if (!this.client) return this._localGet('appointments');

    let query = this.client
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (filters.status)       query = query.eq('status', filters.status);
    if (filters.doctor_id)    query = query.eq('doctor_id', filters.doctor_id);
    if (filters.patient_name) query = query.ilike('patient_name', `%${filters.patient_name}%`);
    if (filters.date_from)    query = query.gte('date', filters.date_from);
    if (filters.date_to)      query = query.lte('date', filters.date_to);

    const { data, error } = await query;
    if (error) { console.error('[DB] getAppointments error:', error); return this._localGet('appointments'); }
    return data || [];
  }

  async addAppointment(appointment) {
    const record = this._prepareRecord(appointment);

    if (!this.client) {
      const saved = this._localAdd('appointments', record);
      SIABus.emit('appointment:insert', saved);
      return saved;
    }

    const { data, error } = await this.client.from('appointments').insert(record).select().single();
    if (error) { console.error('[DB] addAppointment error:', error); throw error; }
    SIABus.emit('appointment:insert', data);
    return data;
  }

  async updateAppointment(id, updates) {
    const record = { ...updates, updated_at: new Date().toISOString() };
    delete record.id;
    delete record.created_at;

    if (!this.client) {
      const saved = this._localUpdate('appointments', id, record);
      SIABus.emit('appointment:update', saved);
      return saved;
    }

    const { data, error } = await this.client.from('appointments').update(record).eq('id', id).select().single();
    if (error) { console.error('[DB] updateAppointment error:', error); throw error; }
    SIABus.emit('appointment:update', data);
    return data;
  }

  async deleteAppointment(id) {
    if (!this.client) {
      this._localDelete('appointments', id);
      SIABus.emit('appointment:delete', { id });
      return;
    }

    const { error } = await this.client.from('appointments').delete().eq('id', id);
    if (error) { console.error('[DB] deleteAppointment error:', error); throw error; }
    SIABus.emit('appointment:delete', { id });
  }

  /* ─────────────────────────────────────────
     TREATMENTS
     ───────────────────────────────────────── */
  async getTreatments(filters = {}) {
    if (!this.client) return this._localGet('treatments');

    let query = this.client
      .from('treatments')
      .select('*')
      .order('date', { ascending: false });

    if (filters.status)       query = query.eq('status', filters.status);
    if (filters.patient_name) query = query.ilike('patient_name', `%${filters.patient_name}%`);
    if (filters.doctor_id)    query = query.eq('doctor_id', filters.doctor_id);

    const { data, error } = await query;
    if (error) { console.error('[DB] getTreatments error:', error); return this._localGet('treatments'); }
    return data || [];
  }

  async addTreatment(treatment) {
    const record = this._prepareRecord(treatment);

    if (!this.client) {
      const saved = this._localAdd('treatments', record);
      SIABus.emit('treatment:insert', saved);
      return saved;
    }

    const { data, error } = await this.client.from('treatments').insert(record).select().single();
    if (error) { console.error('[DB] addTreatment error:', error); throw error; }
    SIABus.emit('treatment:insert', data);
    return data;
  }

  async updateTreatment(id, updates) {
    const record = { ...updates, updated_at: new Date().toISOString() };
    delete record.id;
    delete record.created_at;

    if (!this.client) {
      const saved = this._localUpdate('treatments', id, record);
      SIABus.emit('treatment:update', saved);
      return saved;
    }

    const { data, error } = await this.client.from('treatments').update(record).eq('id', id).select().single();
    if (error) { console.error('[DB] updateTreatment error:', error); throw error; }
    SIABus.emit('treatment:update', data);
    return data;
  }

  async deleteTreatment(id) {
    if (!this.client) {
      this._localDelete('treatments', id);
      SIABus.emit('treatment:delete', { id });
      return;
    }

    const { error } = await this.client.from('treatments').delete().eq('id', id);
    if (error) { console.error('[DB] deleteTreatment error:', error); throw error; }
    SIABus.emit('treatment:delete', { id });
  }

  /* ─────────────────────────────────────────
     PATIENTS
     ───────────────────────────────────────── */
  async getPatients() {
    if (!this.client) return this._localGet('patients');

    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .order('name', { ascending: true });

    if (error) { console.error('[DB] getPatients error:', error); return this._localGet('patients'); }
    return data || [];
  }

  async addPatient(patient) {
    const record = this._prepareRecord(patient);
    if (!this.client) return this._localAdd('patients', record);

    const { data, error } = await this.client.from('patients').insert(record).select().single();
    if (error) { console.error('[DB] addPatient error:', error); throw error; }
    return data;
  }

  /* ─────────────────────────────────────────
     DOCTORS / STAFF
     ───────────────────────────────────────── */
  async getDoctors() {
    if (!this.client) return this._getDefaultDoctors();

    const { data, error } = await this.client
      .from('staff')
      .select('*')
      .eq('role', 'Doctor')
      .order('name', { ascending: true });

    if (error || !data?.length) return this._getDefaultDoctors();
    return data;
  }

  async getNurses() {
    if (!this.client) return this._getDefaultNurses();

    const { data, error } = await this.client
      .from('staff')
      .select('*')
      .eq('role', 'Nurse')
      .order('name', { ascending: true });

    if (error || !data?.length) return this._getDefaultNurses();
    return data;
  }

  /* ─────────────────────────────────────────
     STAFF ASSIGNMENTS
     ───────────────────────────────────────── */
  async getAssignments(treatmentId) {
    if (!this.client) return this._localGet('assignments').filter(a => a.treatment_id === treatmentId);

    const { data, error } = await this.client
      .from('staff_assignments')
      .select('*')
      .eq('treatment_id', treatmentId);

    if (error) return [];
    return data || [];
  }

  async saveAssignment(assignment) {
    const record = this._prepareRecord(assignment);
    if (!this.client) return this._localAdd('assignments', record);

    const { data, error } = await this.client.from('staff_assignments').upsert(record).select().single();
    if (error) throw error;
    return data;
  }

  /* ─────────────────────────────────────────
     DASHBOARD STATS
     ───────────────────────────────────────── */
  async getStats() {
    try {
      const [appointments, treatments] = await Promise.all([
        this.getAppointments(),
        this.getTreatments()
      ]);

      const today = new Date().toISOString().split('T')[0];
      const upcoming = appointments.filter(a =>
        a.date >= today && ['Scheduled', 'Confirmed', 'Pending'].includes(a.status)
      );

      return {
        totalAppointments:    appointments.length,
        upcomingAppointments: upcoming.length,
        totalTreatments:      treatments.length,
        completedTreatments:  treatments.filter(t => t.status === 'Completed').length,
        scheduledToday:       appointments.filter(a => a.date === today).length,
        pendingTreatments:    treatments.filter(t => t.status === 'Ongoing').length,
      };
    } catch (err) {
      console.error('[DB] getStats error:', err);
      return { totalAppointments: 0, upcomingAppointments: 0, totalTreatments: 0, completedTreatments: 0 };
    }
  }

  /* ─────────────────────────────────────────
     EXPORT HELPERS
     ───────────────────────────────────────── */
  async exportToJSON(table) {
    const data = await this[`get${table.charAt(0).toUpperCase() + table.slice(1)}`]();
    return JSON.stringify(data, null, 2);
  }

  async exportToCSV(table) {
    const data = await this[`get${table.charAt(0).toUpperCase() + table.slice(1)}`]();
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /* ─────────────────────────────────────────
     PRIVATE — localStorage helpers
     ───────────────────────────────────────── */
  _prepareRecord(record) {
    return {
      ...record,
      id: record.id || this._generateId(),
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  _generateId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  _localGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  _localAdd(key, record) {
    const arr = this._localGet(key);
    arr.push(record);
    localStorage.setItem(key, JSON.stringify(arr));
    return record;
  }

  _localUpdate(key, id, updates) {
    const arr = this._localGet(key);
    const idx = arr.findIndex(r => r.id === id);
    if (idx > -1) {
      arr[idx] = { ...arr[idx], ...updates };
      localStorage.setItem(key, JSON.stringify(arr));
      return arr[idx];
    }
    return null;
  }

  _localDelete(key, id) {
    const arr = this._localGet(key).filter(r => r.id !== id);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  _getDefaultDoctors() {
    return [
      { id: 1, name: 'Dr. Sarah Chen',      role: 'Doctor', specialty: 'General Medicine',  contact: 'sarah.chen@medcenter.com' },
      { id: 2, name: 'Dr. Michael Johnson', role: 'Doctor', specialty: 'Cardiology',        contact: 'michael.j@medcenter.com'  },
      { id: 3, name: 'Dr. Emily Roberts',   role: 'Doctor', specialty: 'Pediatrics',        contact: 'emily.r@medcenter.com'    },
      { id: 4, name: 'Dr. James Torres',    role: 'Doctor', specialty: 'Orthopedics',       contact: 'james.t@medcenter.com'    },
      { id: 5, name: 'Dr. Anna Kim',        role: 'Doctor', specialty: 'Dermatology',       contact: 'anna.k@medcenter.com'     },
    ];
  }

  _getDefaultNurses() {
    return [
      { id: 10, name: 'Nurse Maria Santos', role: 'Nurse', contact: 'maria.s@medcenter.com'   },
      { id: 11, name: 'Nurse John Reyes',   role: 'Nurse', contact: 'john.r@medcenter.com'    },
      { id: 12, name: 'Nurse Lisa Park',    role: 'Nurse', contact: 'lisa.p@medcenter.com'    },
    ];
  }
}

/* ─────────────────────────────────────────
   Global DB factory — call initDB() on each page
   ───────────────────────────────────────── */
function initDB() {
  const client = window._supabaseReady ? window.supabaseClient : null;
  return new AppointmentDB(client);
}