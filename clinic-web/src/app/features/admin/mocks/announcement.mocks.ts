import { Announcement } from '../models/announcement.model';

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { 
    id: 'ann-1', 
    title: 'Holiday Schedule Notice', 
    body: 'Clinic will be closed on June 12 (Independence Day). Regular schedule resumes June 13.', 
    imageUrl: null, 
    isActive: true, 
    createdAt: '2025-05-01T00:00:00Z' 
  },
  { 
    id: 'ann-2', 
    title: 'New Doctor Joining',       
    body: 'We welcome Dr. Ana Cruz to our team! She will be accepting OB-Gyn patients starting June 1.', 
    imageUrl: null, 
    isActive: true, 
    createdAt: '2025-04-20T00:00:00Z' 
  },
];
