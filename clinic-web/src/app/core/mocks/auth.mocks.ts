import { AuthUser } from '../models/auth.models';

export const MOCK_USERS: Record<string, AuthUser> = {
  'admin@clinic.ph': {
    id: '00000000-0000-0000-0000-000000000001',
    fullName: 'Admin User',
    email: 'admin@clinic.ph',
    role: 'Admin',
    avatarUrl: null,
    isFirstLogin: false,
    isEmailVerified: true,
  },
  'staff@clinic.ph': {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'Staff User',
    email: 'staff@clinic.ph',
    role: 'Staff',
    avatarUrl: null,
    isFirstLogin: false,
    isEmailVerified: true,
  },
  'dr.santos@clinic.ph': {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'Dr. Maria Santos',
    email: 'dr.santos@clinic.ph',
    role: 'Doctor',
    avatarUrl: null,
    isFirstLogin: false,
    isEmailVerified: true,
  },
  'patient@clinic.ph': {
    id: '00000000-0000-0000-0000-000000000004',
    fullName: 'Juan dela Cruz',
    email: 'patient@clinic.ph',
    role: 'Patient',
    avatarUrl: null,
    isFirstLogin: false,
    isEmailVerified: false,  // ← triggers email verification banner
  },
};

export const MOCK_PASSWORDS: Record<string, string> = {
  'admin@clinic.ph':     'Admin@123456',
  'staff@clinic.ph':     'Staff@123456',
  'dr.santos@clinic.ph': 'Doctor@123456',
  'patient@clinic.ph':   'Patient@123456',
};
