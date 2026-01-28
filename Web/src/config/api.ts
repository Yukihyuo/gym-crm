// Configuración de la API
export const API_URL = 'http://localhost:3010/';

// Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_URL}v1/users/login`,
  
  // Users endpoints
  USERS: {
    REGISTER: `${API_URL}v1/users/register`,
    GET_ALL_USERS: `${API_URL}v1/users/getAll`,
    GET_BY_ROLE: (roleName: string) => `${API_URL}v1/users/getByRole/${roleName}`,

  },

  // Pages endpoints
  PAGES: {
    CREATE: `${API_URL}v1/pages/create`,
    GET_ALL: `${API_URL}v1/pages/getAll`,
    GET_BY_ID: (pageId: string) => `${API_URL}v1/pages/getById/${pageId}`,
    UPDATE: (pageId: string) => `${API_URL}v1/pages/update/${pageId}`,
    DELETE: (pageId: string) => `${API_URL}v1/pages/delete/${pageId}`,
    ADD_MODULES: (pageId: string) => `${API_URL}v1/pages/addModules/${pageId}`,
    REMOVE_MODULE: (pageId: string, moduleId: string) => `${API_URL}v1/pages/removeModule/${pageId}/${moduleId}`
  },

  // Roles endpoints
  ROLES: {
    CREATE: `${API_URL}v1/roles/create`,
    GET_ALL: `${API_URL}v1/roles/getAll`,
    GET_BY_ID: (roleId: string) => `${API_URL}v1/roles/getById/${roleId}`,
    UPDATE: (roleId: string) => `${API_URL}v1/roles/update/${roleId}`,
    DELETE: (roleId: string) => `${API_URL}v1/roles/delete/${roleId}`
  },

  // Products endpoints
  PRODUCTS:{
    CREATE: `${API_URL}v1/products/create`,
    GET_ALL: `${API_URL}v1/products/getAll`,
    GET_BY_ID: (productId: string) => `${API_URL}v1/products/getById/${productId}`,
    UPDATE: (productId: string) => `${API_URL}v1/products/update/${productId}`,
    DELETE: (productId: string) => `${API_URL}v1/products/delete/${productId}`
  },

  // Sales endpoints
  SALES:{
    CREATE: `${API_URL}v1/sales/create`,
    GET_ALL: `${API_URL}v1/sales/getAll`,
    GET_BY_ID: (saleId: string) => `${API_URL}v1/sales/getById/${saleId}`,
    STATS: `${API_URL}v1/sales/stats/summary`
  }

};
