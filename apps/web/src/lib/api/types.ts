export interface Business {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  contact_email: string;
  contact_phone?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type BusinessCreate = Omit<Business, 'id' | 'is_active' | 'settings' | 'created_at' | 'updated_at'>;
export type BusinessUpdate = Partial<BusinessCreate>;
