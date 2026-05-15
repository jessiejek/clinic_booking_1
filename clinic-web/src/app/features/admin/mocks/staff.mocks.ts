import { StaffMember } from '../models/staff.model';

export const MOCK_STAFF: StaffMember[] = [
  { 
    id: 'staff-1', 
    userId: '00000000-0000-0000-0000-000000000002', 
    fullName: 'Staff User',    
    email: 'staff@clinic.ph',   
    isActive: true, 
    createdAt: '2025-01-01T00:00:00Z' 
  },
];
