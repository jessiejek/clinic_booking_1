export type BookingStatus = 'Pending' | 'ProofSubmitted' | 'Confirmed' | 'OnHold' | 'Cancelled' | 'Completed' | 'Expired' | 'NoShow';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Waived' | 'Refunded';
export type PaymentMode = 'Online' | 'PayAtClinic';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'Available' | 'Pending' | 'Full';
  remainingCapacity: number;
}

export interface Booking {
  id: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  queueNumber: number | null;
  totalFee: number;
  isWalkIn: boolean;
  orNumber: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface SlotAvailability {
  doctorId: string;
  date: string;
  slots: TimeSlot[];
}

export interface CreateBookingRequest {
  doctorId: string;
  serviceId: string;
  appointmentDate: string;
  slotStartTime: string;
  paymentMode: PaymentMode;
}

export interface BookingResult {
  bookingId: string;
  queueNumber: number | null;
  status: BookingStatus;
}

export interface SubmitProofRequest {
  referenceNumber?: string;
  receiptImage?: File | string;
}

export interface BookingFilters {
  date?: string;
  doctorId?: string;
  status?: BookingStatus;
}

export interface PatientSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface WalkInBookingRequest extends CreateBookingRequest {
  patientId?: string;
  guestName?: string;
  guestPhone?: string;
}
