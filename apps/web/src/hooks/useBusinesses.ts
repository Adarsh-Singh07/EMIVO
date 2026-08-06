import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api/client';
import { Business, BusinessCreate } from '../lib/api/types';

export const useBusinesses = () => {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: async (): Promise<Business[]> => {
      // In MVP, a user might only belong to one/few businesses
      const { data } = await api.get('/v1/businesses');
      return data;
    },
  });
};

export const useCreateBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (businessData: BusinessCreate): Promise<Business> => {
      const { data } = await api.post('/v1/businesses', businessData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
};
