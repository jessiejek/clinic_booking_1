export interface ClinicSettings {
  clinicName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  phone: string;
  email: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  cancellationDeadlineHours: number;
  isPayAtClinicMode: boolean;
  payAtClinicNoShowWindowMinutes: number;
  patientPortalEnabled: boolean;
  vaccinationReminderEnabled: boolean;
  documentHeaderHtml: string | null;
  documentFooterHtml: string | null;
}

export interface UpdateSettingsRequest extends Partial<ClinicSettings> {}
