# Appointment & Treatment System - Setup Guide

## 🚀 Quick Start

### 1. **Installation**
- The system is ready to use with localStorage by default
- No installation required - just open `index.html` in a browser

### 2. **Database Setup (Optional)**

#### Option A: Using Supabase (Recommended)
1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Run the SQL from `database_schema.sql` in the Supabase SQL Editor
4. Copy your Supabase URL and API Key
5. Update `supabase-config.js`:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
```

#### Option B: Using Firebase
- Modify `db-helper.js` to use Firebase Realtime Database
- Update `supabase-config.js` with Firebase configuration

#### Option C: Using Local Storage (Current Default)
- Data is saved locally in the browser
- Perfect for testing and development

### 3. **File Structure**
```
Appointment System/
├── index.html              # Dashboard
├── appointment.html        # Appointment Module
├── treatment.html          # Treatment Module
├── supabase-config.js      # Database Configuration
├── db-helper.js            # Database Functions
└── database_schema.sql     # SQL Schema
```

### 4. **Features**

#### 📅 Appointment Module
- Schedule appointments with doctors
- Set appointment type and reason
- Track appointment status
- View upcoming appointments

#### 💊 Treatment Module
- Record diagnoses and treatments
- Track treatment procedures
- Maintain patient treatment history
- Assign doctors and nurses to treatments

### 5. **Usage**

#### Adding an Appointment
1. Go to Appointments page
2. Fill in patient details
3. Select doctor and time
4. Click "Save Appointment"

#### Recording a Treatment
1. Go to Treatment page
2. Enter patient and diagnosis
3. Select treatment type
4. Click "Record Treatment"

#### Assigning Staff
1. Select a treatment
2. Assign doctor
3. Select nurse(s)
4. Click "Save Assignment"

#### Searching Treatment History
1. Type patient name in search box
2. View all treatments for that patient

### 6. **Database Tables**

#### Appointments
- id, patient_name, patient_id, doctor_id, doctor_name
- date, time, type, reason, status
- created_at, updated_at

#### Treatments
- id, patient_name, patient_id, diagnosis
- type, description, procedure, date, status
- created_at, updated_at

#### Staff Assignments
- id, treatment_id, patient_name, doctor_id, doctor_name
- nurses, date, notes, created_at, updated_at

### 7. **Customization**

#### Add More Doctors/Nurses
In `appointment.html` or `treatment.html`, update:
```javascript
doctors = [
    { id: 1, name: 'Dr. Name', contact: 'email@hospital.com' },
    // Add more...
];
```

#### Change Colors
Edit the `<style>` section in each HTML file:
```css
.navbar { background: #0f3b5c; } /* Change navbar color */
button { background: #2c7da0; } /* Change button color */
```

### 8. **Data Persistence**

- **With Supabase**: Data is stored in the cloud
- **With localStorage**: Data is stored in browser (survives refresh, but not clearing cache)
- **Fallback**: System works with or without database

### 9. **Troubleshooting**

#### Data not saving?
- Check browser console for errors (F12)
- Verify Supabase configuration if using cloud DB
- Ensure browser allows localStorage

#### Appointments not showing?
- Check that appointments were added to treatments or appointments table
- Verify date/time fields are properly filled

#### Staff not loading?
- Default doctors and nurses are pre-loaded
- If using Supabase, ensure staff table exists

### 10. **Security Notes**
- Current RLS policies allow all operations
- For production: Implement proper authentication and authorization
- Store sensitive data securely
- Use environment variables for API keys

### 11. **Next Steps**
- [ ] Set up Supabase database
- [ ] Update API credentials
- [ ] Customize staff list
- [ ] Add authentication
- [ ] Implement role-based access
- [ ] Set up backups

---

**Created:** May 2026  
**System:** Appointment & Treatment Management System  
**Version:** 1.0