-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(100),
    doctor_id UUID REFERENCES staff(id),
    doctor_name VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    type VARCHAR(100),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TREATMENTS TABLE
CREATE TABLE IF NOT EXISTS treatments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(100),
    diagnosis TEXT,
    type VARCHAR(100),
    description TEXT,
    procedure VARCHAR(255),
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STAFF ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    treatment_id UUID REFERENCES treatments(id),
    patient_name VARCHAR(255),
    doctor_id UUID REFERENCES staff(id),
    doctor_name VARCHAR(255),
    nurses TEXT,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_appointments_patient_name ON appointments(patient_name);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_treatments_patient_name ON treatments(patient_name);
CREATE INDEX idx_treatments_date ON treatments(date);
CREATE INDEX idx_treatments_status ON treatments(status);
CREATE INDEX idx_assignments_patient_name ON staff_assignments(patient_name);

-- RLS POLICIES FOR SECURITY
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- ALLOW ALL OPERATIONS (Modify based on your security requirements)
CREATE POLICY "Allow all operations on appointments" ON appointments FOR ALL USING (true);
CREATE POLICY "Allow all operations on treatments" ON treatments FOR ALL USING (true);
CREATE POLICY "Allow all operations on assignments" ON staff_assignments FOR ALL USING (true);