import { ClinicSettings } from '../models/settings.model';

export const MOCK_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: 'Maliwanag Family Clinic',
  logoUrl: null,
  primaryColor: '#1A6B5A',
  secondaryColor: '#F0A500',
  address: '123 Rizal Ave, Quezon City',
  phone: '+63 2 8123 4567',
  email: 'info@maliwanagclinic.ph',
  facebookUrl: null,
  instagramUrl: null,
  cancellationDeadlineHours: 24,
  isPayAtClinicMode: false,
  payAtClinicNoShowWindowMinutes: 30,
  patientPortalEnabled: true,
  vaccinationReminderEnabled: true,
  documentHeaderHtml: null,
  documentFooterHtml: null,
};
