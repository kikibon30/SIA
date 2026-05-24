// Database Helper Functions
class AppointmentDB {
    constructor(supabase) {
        this.db = supabase;
    }

    // APPOINTMENTS CRUD
    async getAppointments() {
        try {
            const { data, error } = await this.db
                .from('appointments')
                .select('*')
                .order('date', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    }

    async addAppointment(appointment) {
        try {
            const { data, error } = await this.db
                .from('appointments')
                .insert([appointment])
                .select();
            
            if (error) throw error;
            return data?.[0];
        } catch (error) {
            console.error('Error adding appointment:', error);
            return null;
        }
    }

    async updateAppointment(id, appointment) {
        try {
            const { data, error } = await this.db
                .from('appointments')
                .update(appointment)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data?.[0];
        } catch (error) {
            console.error('Error updating appointment:', error);
            return null;
        }
    }

    async deleteAppointment(id) {
        try {
            const { error } = await this.db
                .from('appointments')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting appointment:', error);
            return false;
        }
    }

    // TREATMENTS CRUD
    async getTreatments() {
        try {
            const { data, error } = await this.db
                .from('treatments')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching treatments:', error);
            return [];
        }
    }

    async addTreatment(treatment) {
        try {
            const { data, error } = await this.db
                .from('treatments')
                .insert([treatment])
                .select();
            
            if (error) throw error;
            return data?.[0];
        } catch (error) {
            console.error('Error adding treatment:', error);
            return null;
        }
    }

    async updateTreatment(id, treatment) {
        try {
            const { data, error } = await this.db
                .from('treatments')
                .update(treatment)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data?.[0];
        } catch (error) {
            console.error('Error updating treatment:', error);
            return null;
        }
    }

    async deleteTreatment(id) {
        try {
            const { error } = await this.db
                .from('treatments')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting treatment:', error);
            return false;
        }
    }

    // STAFF ASSIGNMENTS CRUD
    async getAssignments() {
        try {
            const { data, error } = await this.db
                .from('staff_assignments')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching assignments:', error);
            return [];
        }
    }

    async addAssignment(assignment) {
        try {
            const { data, error } = await this.db
                .from('staff_assignments')
                .insert([assignment])
                .select();
            
            if (error) throw error;
            return data?.[0];
        } catch (error) {
            console.error('Error adding assignment:', error);
            return null;
        }
    }

    async deleteAssignment(id) {
        try {
            const { error } = await this.db
                .from('staff_assignments')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting assignment:', error);
            return false;
        }
    }

    // DOCTORS RETRIEVAL - Filter by position (Doctor, Surgeon, Specialist, Intern, etc.)
    async getDoctors() {
        try {
            const { data, error } = await this.db
                .from('staff')
                .select('staff_id, first_name, last_name, position')
                .ilike('position', '%Doctor%');
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            // Format the response for use in frontend
            return (data || []).map(doc => ({
                id: doc.staff_id,
                name: `${doc.first_name || 'Doctor'} ${doc.last_name || ''}`.trim(),
                position: doc.position,
                contact: doc.position
            }));
        } catch (error) {
            console.error('Error fetching doctors:', error);
            return [];
        }
    }

    // NURSES RETRIEVAL - Filter by position containing 'Nurse'
    async getNurses() {
        try {
            const { data, error } = await this.db
                .from('staff')
                .select('staff_id, first_name, position')
                .ilike('position', '%Nurse%');
            
            if (error) throw error;
            
            // Format the response for use in frontend
            return (data || []).map(nurse => ({
                id: nurse.staff_id,
                name: nurse.first_name || 'Nurse',
                position: nurse.position
            }));
        } catch (error) {
            console.error('Error fetching nurses:', error);
            return [];
        }
    }

    // GET PATIENTS FROM PATIENT TABLE - With multiple fallbacks
    async getPatients() {
        try {
            console.log('🔍 Fetching patients...');
            
            // Try to fetch from patient table with first_name and last_name
            const { data, error } = await this.db
                .from('patient')
                .select('patient_id, first_name, last_name')
                .order('first_name', { ascending: true });
            
            if (error) {
                console.error('❌ Error fetching patients:', error);
                throw error;
            }
            
            console.log('✅ Patients fetched:', data);
            
            // Format the response - combine first_name and last_name
            return (data || []).map(patient => ({
                id: patient.patient_id,
                name: `${patient.first_name} ${patient.last_name}`.trim()
            }));
            
        } catch (error) {
            console.error('💥 Fatal error fetching patients:', error);
            return [];
        }
    }

    // PATIENT SEARCH
    async searchPatientTreatments(patientName) {
        try {
            const { data, error } = await this.db
                .from('treatments')
                .select('*')
                .ilike('patient_name', `%${patientName}%`)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching treatments:', error);
            return [];
        }
    }
}

// Export for global use
window.AppointmentDB = AppointmentDB;