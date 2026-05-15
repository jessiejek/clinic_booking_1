export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAnnouncementRequest extends Omit<Announcement, 'id' | 'createdAt'> {}
export interface UpdateAnnouncementRequest extends Partial<CreateAnnouncementRequest> {}
