export interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  licenseNumber: string | null;
  ptrNumber: string | null;
  s2Number: string | null;
  status: 'Active' | 'Inactive' | 'OnLeave';
  services: Service[];
  averageRating: number;
}

export interface DoctorSchedule {
  dayOfWeek: number; // 0=Sun, 1=Mon ... 6=Sat
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
  isActive: boolean;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface CreateDoctorRequest extends Omit<Doctor, 'id' | 'services' | 'averageRating' | 'profilePhotoUrl'> {}
export interface UpdateDoctorRequest extends Partial<CreateDoctorRequest> {}

import { Service } from './service.model';
