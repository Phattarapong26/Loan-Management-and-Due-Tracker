/**
 * Thai Address API
 * API functions for Thai provinces, districts, and subdistricts
 */

import { apiClient } from '@/shared/lib/api-client';

export interface Province {
  id: number;
  name: string;
  region: 'north' | 'northeast' | 'central' | 'south';
}

export interface District {
  id: number;
  provinceId: number;
  name: string;
}

export interface Subdistrict {
  id: number;
  districtId: number;
  name: string;
  postalCode: string;
}

/**
 * Get all Thai provinces
 */
export const getProvinces = async () => {
  return apiClient.get<Province[]>('/api/thai-address/provinces');
};

/**
 * Get districts by province name
 */
export const getDistricts = async (province: string) => {
  return apiClient.get<District[]>('/api/thai-address/districts', { province });
};

/**
 * Get subdistricts by province and district name
 */
export const getSubdistricts = async (province: string, district: string) => {
  return apiClient.get<Subdistrict[]>('/api/thai-address/subdistricts', { 
    province, 
    district 
  });
};

/**
 * Get postal code
 */
export const getPostalCode = async (
  province: string, 
  district: string, 
  subdistrict: string
) => {
  return apiClient.get<{ postalCode: string }>('/api/thai-address/postal-code', { 
    province, 
    district, 
    subdistrict 
  });
};

export const thaiAddressApi = {
  getProvinces,
  getDistricts,
  getSubdistricts,
  getPostalCode,
};
