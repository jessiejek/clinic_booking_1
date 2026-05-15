export interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
}
