import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setTokens, removeTokens } from '@/lib/api-client';

export type UserCreate = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

export type UserLogin = {
  email: string;
  password: string;
};

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (data: UserLogin) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', data);
      const { access_token, refresh_token } = response.data;
      setTokens(access_token, refresh_token);
      router.push('/dashboard');
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'An error occurred during login.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (data: UserCreate) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/register', data);
      router.push('/login');
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'An error occurred during registration.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    removeTokens();
    router.push('/login');
  }, [router]);

  return {
    login,
    register,
    logout,
    isLoading,
    error,
  };
};
