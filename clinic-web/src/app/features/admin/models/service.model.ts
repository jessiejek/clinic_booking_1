export interface Service {
  id: string;
  name: string;
  description: string | null;
  estimatedDurationMinutes: number;
  price: number;
}

export interface CreateServiceRequest extends Omit<Service, 'id'> {}
export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {}
