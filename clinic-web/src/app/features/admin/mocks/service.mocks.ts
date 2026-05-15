import { Service } from '../models/service.model';

export const MOCK_SERVICES: Service[] = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'General Consultation',   description: null, estimatedDurationMinutes: 30, price: 500 },
  { id: '20000000-0000-0000-0000-000000000002', name: 'Pediatric Checkup',      description: null, estimatedDurationMinutes: 30, price: 600 },
  { id: '20000000-0000-0000-0000-000000000003', name: 'Prenatal Checkup',       description: null, estimatedDurationMinutes: 30, price: 700 },
  { id: '20000000-0000-0000-0000-000000000004', name: 'Annual Physical Exam',   description: null, estimatedDurationMinutes: 60, price: 1500 },
  { id: '20000000-0000-0000-0000-000000000005', name: 'Wound Dressing',         description: null, estimatedDurationMinutes: 15, price: 300 },
];
