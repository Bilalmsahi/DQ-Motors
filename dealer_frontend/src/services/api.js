const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper function to handle the request logic
 * It acts like an "Interceptor" by attaching headers automatically
 */
const customFetch = async (endpoint, options = {}) => {
  // 1. Prepare Headers
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers, // Allow overriding headers if needed
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. Configure Config Object
  const config = {
    ...options,
    headers,
  };

  // 3. Handle Body (stringify automatically if it's an object)
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    // 4. Make the Request
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // 5. Check for HTTP Errors (fetch doesn't reject 4xx/5xx automatically)
    if (!response.ok) {
      // Try to parse the error message from the backend
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error: ${response.statusText}`);
    }

    // 6. Return JSON (if no content, return null)
    if (response.status === 204) return null;
    return await response.json();
    
  } catch (error) {
    console.error("API Request Failed:", error);
    throw error; // Re-throw so components can handle it
  }
};

// --- Auth Functions ---

export const login = async (username, password) => {
  // Note: We don't use customFetch here because we might not want standard headers, 
  // but for consistency, we can use it or raw fetch. 
  // Using customFetch is fine as it just handles JSON headers.
  
  const data = await customFetch('/auth/token/', {
    method: 'POST',
    body: { username, password },
  });

  if (data.access) {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
  }
  
  return data;
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// --- FormData Upload (for file uploads) ---

const uploadFormData = async (endpoint, formData, method = 'POST') => {
  const token = localStorage.getItem('access_token');
  
  const headers = {};
  // Don't set Content-Type for FormData - browser sets it automatically with boundary
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: formData, // FormData object directly
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || JSON.stringify(errorData) || `Error: ${response.statusText}`);
    }

    if (response.status === 204) return null;
    return await response.json();
    
  } catch (error) {
    console.error("Upload Request Failed:", error);
    throw error;
  }
};

// --- Auth Functions ---

export const register = async (userData) => {
  /**
   * Register a new user account
   * @param {Object} userData - { username, email, password, password2, first_name?, last_name?, phone? }
   * @returns {Object} - { message, user, tokens }
   */
  const data = await customFetch('/auth/register/', {
    method: 'POST',
    body: userData,
  });

  // Auto-login after registration
  if (data.tokens?.access) {
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
  }
  
  return data;
};

export const getProfile = () => customFetch('/auth/profile/', { method: 'GET' });
export const updateProfile = (data) => customFetch('/auth/profile/', { method: 'PATCH', body: data });

// --- Google OAuth Login ---

export const googleLogin = async (credential) => {
  /**
   * Authenticate with Google OAuth using ID Token
   * @param {string} credential - The ID token from Google Sign-In popup
   * @returns {Object} - { access, refresh, user, created }
   */
  const data = await customFetch('/auth/google/', {
    method: 'POST',
    body: { id_token: credential },
  });

  // Store tokens
  if (data.access) {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
  }
  
  return data;
};

// --- My Listings (User Ads) ---

export const getMyListings = () => customFetch('/inventory/vehicles/my_listings/', { method: 'GET' });

// --- API Object (Mimicking Axios syntax for convenience) ---

const api = {
  get: (endpoint) => customFetch(endpoint, { method: 'GET' }),
  post: (endpoint, body) => customFetch(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => customFetch(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => customFetch(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => customFetch(endpoint, { method: 'DELETE' }),
  
  // FormData upload methods
  upload: (endpoint, formData) => uploadFormData(endpoint, formData, 'POST'),
  uploadPut: (endpoint, formData) => uploadFormData(endpoint, formData, 'PUT'),
  uploadPatch: (endpoint, formData) => uploadFormData(endpoint, formData, 'PATCH'),
};

export default api;