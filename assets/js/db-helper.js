// Database Helper Class for CRUD Operations
class DatabaseHelper {
    constructor() {
        this.supabase = window.supabaseClient;
        this.tables = {
            appointments: 'appointments',
            treatments: 'treatments',
            patients: 'patients'
        };
    }

    // ============ APPOINTMENT CRUD ============
    
    async getAppointments(filters = {}) {
        try {
            let query = this.supabase
                .from(this.tables.appointments)
                .select('*');
            
            // Apply filters
            if (filters.date_from) {
                query = query.gte('date', filters.date_from);
            }
            if (filters.date_to) {
                query = query.lte('date', filters.date_to);
            }
            if (filters.patient_name) {
                query = query.ilike('patient_name', `%${filters.patient_name}%`);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            
            const { data, error } = await query.order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting appointments:', error);
            return [];
        }
    }

    async createAppointment(appointment) {
        try {
            const payload = {
                patient_name: appointment.patient_name,
                doctor_name: appointment.doctor_name,
                date: appointment.date,
                time: appointment.time,
                type: appointment.type,
                status: appointment.status || 'Scheduled'
            };
            if (appointment.patient_id) {
                payload.patient_id = appointment.patient_id;
            }
            const { data, error } = await this.supabase
                .from(this.tables.appointments)
                .insert([payload])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating appointment:', error);
            return { success: false, error: error.message };
        }
    }

    async updateAppointment(id, updates) {
        try {
            const payload = {
                patient_name: updates.patient_name,
                doctor_name: updates.doctor_name,
                date: updates.date,
                time: updates.time,
                type: updates.type,
                status: updates.status
            };
            if (updates.patient_id) {
                payload.patient_id = updates.patient_id;
            }
            const { data, error } = await this.supabase
                .from(this.tables.appointments)
                .update(payload)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating appointment:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAppointment(id) {
        try {
            const { error } = await this.supabase
                .from(this.tables.appointments)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting appointment:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ TREATMENT CRUD ============
    
    async getTreatments(filters = {}) {
        try {
            let query = this.supabase
                .from(this.tables.treatments)
                .select('*');
            
            if (filters.patient_name) {
                query = query.ilike('patient_name', `%${filters.patient_name}%`);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            
            const { data, error } = await query.order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting treatments:', error);
            return [];
        }
    }

    async createTreatment(treatment) {
        try {
            const initialPayload = {
                patient_name: treatment.patient_name,
                patient_id: treatment.patient_id || null,
                diagnosis: treatment.diagnosis,
                type: treatment.type,
                description: treatment.description || '',
                procedure: treatment.procedure || '',
                doctor_name: treatment.doctor_name || '',
                date: treatment.date,
                status: treatment.status || 'Pending',
                notes: treatment.notes || ''
            };

            let payload = { ...initialPayload };
            while (true) {
                const { data, error } = await this.supabase
                    .from(this.tables.treatments)
                    .insert([payload])
                    .select();

                if (!error) return { success: true, data: data[0] };

                const msg = (error.message || '').toString();
                const m = msg.match(/Could not find the '(.+?)' column/i) || msg.match(/column "(.+?)" does not exist/i);
                if (m && m[1]) {
                    const col = m[1];
                    if (col in payload) {
                        delete payload[col];
                        const keys = Object.keys(payload).filter(k => payload[k] !== undefined);
                        if (!keys.length) break;
                        continue;
                    }
                }

                throw error;
            }
            return { success: false, error: 'Failed to save treatment: no valid columns to insert' };
        } catch (error) {
            console.error('Error creating treatment:', error);
            return { success: false, error: error.message };
        }
    }

    async updateTreatment(id, updates) {
        try {
            const initialPayload = {
                patient_name: updates.patient_name,
                patient_id: updates.patient_id,
                diagnosis: updates.diagnosis,
                type: updates.type,
                description: updates.description,
                procedure: updates.procedure,
                doctor_name: updates.doctor_name,
                date: updates.date,
                status: updates.status,
                notes: updates.notes
            };

            let payload = { ...initialPayload };
            while (true) {
                const { data, error } = await this.supabase
                    .from(this.tables.treatments)
                    .update(payload)
                    .eq('id', id)
                    .select();

                if (!error) return { success: true, data: data[0] };

                const msg = (error.message || '').toString();
                const m = msg.match(/Could not find the '(.+?)' column/i) || msg.match(/column "(.+?)" does not exist/i);
                if (m && m[1]) {
                    const col = m[1];
                    if (col in payload) {
                        delete payload[col];
                        const keys = Object.keys(payload).filter(k => payload[k] !== undefined);
                        if (!keys.length) break;
                        continue;
                    }
                }

                throw error;
            }
            return { success: false, error: 'Failed to update treatment: no valid columns to update' };
        } catch (error) {
            console.error('Error updating treatment:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteTreatment(id) {
        try {
            const { error } = await this.supabase
                .from(this.tables.treatments)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting treatment:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ PATIENTS CRUD ============

    async getPatients(filters = {}) {
        try {
            let query = this.supabase
                .from(this.tables.patients)
                .select('*');

            if (filters.full_name) {
                query = query.ilike('full_name', `%${filters.full_name}%`);
            }
            if (filters.patient_code) {
                query = query.ilike('patient_code', `%${filters.patient_code}%`);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting patients:', error);
            return [];
        }
    }

    async createPatient(patient) {
        try {
            // Build initial payload from incoming patient object
            const initialPayload = {
                full_name: patient.full_name,
                name: patient.full_name,
                patient_code: patient.patient_code,
                dob: patient.dob || null,
                gender: patient.gender || null,
                phone: patient.phone || null,
                email: patient.email || null,
                address: patient.address || null,
                status: patient.status || 'Active'
            };

            // Attempt insert, and if Supabase complains about unknown columns,
            // strip the offending column and retry until success or no columns left.
            let payload = { ...initialPayload };
            while (true) {
                const { data, error } = await this.supabase
                    .from(this.tables.patients)
                    .insert([payload])
                    .select();

                if (!error) return { success: true, data: data[0] };

                // If error message indicates a missing column, remove it and retry
                const msg = (error.message || '').toString();
                const m = msg.match(/Could not find the '(.+?)' column/i) || msg.match(/column "(.+?)" does not exist/i);
                if (m && m[1]) {
                    const col = m[1];
                    if (col in payload) {
                        delete payload[col];
                        // If payload has only primary key left, stop retrying
                        const keys = Object.keys(payload).filter(k => payload[k] !== undefined);
                        if (!keys.length) break;
                        continue; // retry
                    }
                }

                // Unknown error or couldn't resolve column — bubble up
                throw error;
            }
            return { success: false, error: 'Failed to save patient: no valid columns to insert' };
        } catch (error) {
            console.error('Error creating patient:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePatient(id, updates) {
        try {
            const initialPayload = {
                full_name: updates.full_name,
                name: updates.full_name,
                patient_code: updates.patient_code,
                dob: updates.dob || null,
                gender: updates.gender || null,
                phone: updates.phone || null,
                email: updates.email || null,
                address: updates.address || null,
                status: updates.status || 'Active'
            };

            let payload = { ...initialPayload };
            while (true) {
                const { data, error } = await this.supabase
                    .from(this.tables.patients)
                    .update(payload)
                    .eq('id', id)
                    .select();

                if (!error) return { success: true, data: data[0] };

                const msg = (error.message || '').toString();
                const m = msg.match(/Could not find the '(.+?)' column/i) || msg.match(/column "(.+?)" does not exist/i);
                if (m && m[1]) {
                    const col = m[1];
                    if (col in payload) {
                        delete payload[col];
                        const keys = Object.keys(payload).filter(k => payload[k] !== undefined);
                        if (!keys.length) break;
                        continue;
                    }
                }

                throw error;
            }
            return { success: false, error: 'Failed to update patient: no valid columns to update' };
        } catch (error) {
            console.error('Error updating patient:', error);
            return { success: false, error: error.message };
        }
    }

    async deletePatient(id) {
        try {
            const { error } = await this.supabase
                .from(this.tables.patients)
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting patient:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ STATS & DASHBOARD ============
    
    async getStats() {
        try {
            const appointments = await this.getAppointments();
            const treatments = await this.getTreatments();
            const today = new Date().toISOString().split('T')[0];
            
            const scheduledToday = appointments.filter(a => 
                a.date === today && a.status.toLowerCase() !== 'cancelled'
            ).length;
            
            const upcoming = appointments.filter(a => 
                a.date >= today && a.status.toLowerCase() === 'scheduled'
            ).length;
            
            const completedTreatments = treatments.filter(t => 
                t.status.toLowerCase() === 'completed'
            ).length;
            
            const pendingTreatments = treatments.filter(t => 
                t.status.toLowerCase() === 'pending'
            ).length;
            
            return {
                totalAppointments: appointments.length,
                upcomingAppointments: upcoming,
                totalTreatments: treatments.length,
                completedTreatments: completedTreatments,
                scheduledToday: scheduledToday,
                pendingTreatments: pendingTreatments
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalAppointments: 0,
                upcomingAppointments: 0,
                totalTreatments: 0,
                completedTreatments: 0,
                scheduledToday: 0,
                pendingTreatments: 0
            };
        }
    }

    // Real-time subscription
    subscribeToChanges(table, callback) {
        const subscription = this.supabase
            .channel(`${table}-changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: table },
                (payload) => {
                    console.log(`${table} changed:`, payload);
                    callback(payload);
                }
            )
            .subscribe();
        
        return subscription;
    }

    // Test database connection
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from(this.tables.appointments)
                .select('count', { count: 'exact', head: true });
            
            if (error) throw error;
            return { success: true, message: 'Connected to Supabase!' };
        } catch (error) {
            console.error('Connection test failed:', error);
            return { success: false, message: error.message };
        }
    }
}

// Initialize and export
window.db = new DatabaseHelper();