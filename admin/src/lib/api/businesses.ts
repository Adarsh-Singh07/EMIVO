import { fetchApi } from '../api-client'

export interface Business {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface BusinessCreate {
  name: string
}

export async function getBusinesses() {
  return fetchApi<Business[]>('/businesses/')
}

export async function createBusiness(data: BusinessCreate) {
  return fetchApi<Business>('/businesses/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getBusiness(id: string) {
  return fetchApi<Business>('/businesses/' + id)
}
