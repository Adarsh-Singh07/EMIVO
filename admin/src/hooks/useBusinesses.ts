import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export interface Business {
  id: string;
  name: string;
  slug: string;
  contact_email?: string;
  is_active: boolean;
  settings?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface BusinessCreate {
  name: string;
  slug: string;
  contact_email?: string;
  settings?: Record<string, any>;
}

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<Business[]>('/businesses/');
      setBusinesses(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load businesses');
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBusiness = async (data: BusinessCreate): Promise<Business> => {
    try {
      const created = await apiClient.post<Business>('/businesses/', data);
      await fetchBusinesses();
      return created;
    } catch (err: any) {
      throw err;
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return { businesses, isLoading, error, refetch: fetchBusinesses, createBusiness };
}
