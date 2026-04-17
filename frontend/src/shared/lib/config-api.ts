import { apiClient } from '@/shared/lib/api-client';

/**
 * Config API - Frontend configuration management
 */
export const configApi = {
    /**
     * Register the current frontend URL with the backend
     * Call this on app startup to ensure password reset links use the correct URL
     */
    registerFrontendUrl: async () => {
        try {
            const currentUrl = window.location.origin;
            await apiClient.post('/api/config/frontend-url', { url: currentUrl });
            console.log('✅ Frontend URL registered:', currentUrl);
        } catch (error) {
            console.error('❌ Failed to register frontend URL:', error);
        }
    },

    /**
     * Get the current frontend URL from the backend
     */
    getFrontendUrl: async () => {
        try {
            const result = await apiClient.get<{ url: string }>('/api/config/frontend-url');
            return result.data?.url || window.location.origin;
        } catch (error) {
            console.error('❌ Failed to get frontend URL:', error);
            return window.location.origin;
        }
    },
};
