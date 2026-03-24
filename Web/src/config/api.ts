// Configuración de la API
export const API_URL = import.meta.env.VITE_API_URL;


// Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_URL}v1/staff/login`,

  BRANDS: {
    CREATE: `${API_URL}v1/brands/create`,
    CREATE_FULL: `${API_URL}v1/brands/createFullBrand`,
    GET_ALL: `${API_URL}v1/brands/getAll`,
    GET_BY_ID: (brandId: string) => `${API_URL}v1/brands/getById/${brandId}`,
    UPDATE: (brandId: string) => `${API_URL}v1/brands/update/${brandId}`,
    GET_CONFIG: `v1/brands/config`,
    UPDATE_CONFIG: `v1/brands/config`,
    DELETE: (brandId: string) => `${API_URL}v1/brands/delete/${brandId}`
  },

  CASH_CUTS: {
    OPEN: `v1/cash-cuts/open`,
    CLOSE: (cashCutId: string) => `v1/cash-cuts/close/${cashCutId}`,
    UPDATE: (cashCutId: string) => `v1/cash-cuts/update/${cashCutId}`,
    GET_OPEN_BY_USER: (userId: string) => `v1/cash-cuts/open/${userId}`,
    GET_ALL: `v1/cash-cuts/getAll`,
    GET_BY_ID: (cashCutId: string) => `v1/cash-cuts/getById/${cashCutId}`,
    DELETE: (cashCutId: string) => `v1/cash-cuts/delete/${cashCutId}`
  },

  EXPENSES: {
    CREATE: `v1/expenses/create`,
    GET_ALL: `v1/expenses/getAll`,
    GET_BY_ID: (expenseId: string) => `v1/expenses/getById/${expenseId}`,
    UPDATE: (expenseId: string) => `v1/expenses/update/${expenseId}`,
    DELETE: (expenseId: string) => `v1/expenses/delete/${expenseId}`,
  },

  STORES: {
    CREATE: `${API_URL}v1/stores/create`,
    GET_ALL: `${API_URL}v1/stores/getAll`,
    GET_BY_BRAND: (brandId: string) => `${API_URL}v1/stores/brand/${brandId}`,
    GET_BY_ID: (storeId: string) => `${API_URL}v1/stores/getById/${storeId}`,
    UPDATE: (storeId: string) => `${API_URL}v1/stores/update/${storeId}`,
    DELETE: (storeId: string) => `${API_URL}v1/stores/delete/${storeId}`
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
    GET_BY_BRAND: (brandName: string) => `${API_URL}v1/roles/brand/${brandName}`,
    GET_BY_ID: (roleId: string) => `${API_URL}v1/roles/getById/${roleId}`,
    UPDATE: (roleId: string) => `${API_URL}v1/roles/update/${roleId}`,
    DELETE: (roleId: string) => `${API_URL}v1/roles/delete/${roleId}`
  },

  // Staff endpoints
  STAFF: {
    REGISTER: `${API_URL}v1/staff/register`,
    LOGIN: `${API_URL}v1/staff/login`,
    GET_ALL_USERS: `${API_URL}v1/staff/getAll`,
    GET_BY_BRAND: (brandName: string) => `${API_URL}v1/staff/brand/${brandName}`,
    GET_BY_STORE: (storeName: string) => `${API_URL}v1/staff/store/${storeName}`,
    CHANGE_PASSWORD: `${API_URL}v1/staff/changePassword`,
  },

  // Clients endpoints
  CLIENTS: {
    REGISTER: `${API_URL}v1/clients/create`,
    LOGIN: `${API_URL}v1/clients/login`,
    GET_ALL_USERS: `${API_URL}v1/clients/getAll`,
    GET_BY_BRAND: (brandName: string) => `${API_URL}v1/clients/brand/${brandName}`,
    SEARCH_SELECT: (search: string) => `${API_URL}v1/clients/searchSelect/${encodeURIComponent(search)}`,
    GET_BY_STORE: (storeName: string) => `${API_URL}v1/clients/store/${storeName}`,
    GET_BY_ID: (clientId: string) => `${API_URL}v1/clients/getById/${clientId}`,
    UPDATE_BY_ID: (clientId: string) => `${API_URL}v1/clients/update/${clientId}`,
    DELETE_BY_ID: (clientId: string) => `${API_URL}v1/clients/delete/${clientId}`,
    CHANGE_PASSWORD: `${API_URL}v1/clients/changePassword`,
  },

  // Products endpoints
  PRODUCTS: {
    CREATE: `${API_URL}v1/products/create`,
    GET_ALL: (storeId: string) => `${API_URL}v1/products/${storeId}/getAll`,
    GET_BY_ID: (storeId: string, productId: string) => `${API_URL}v1/products/${storeId}/getById/${productId}`,
    UPDATE: (storeId: string, productId: string) => `${API_URL}v1/products/${storeId}/update/${productId}`,
    DELETE: (storeId: string, productId: string) => `${API_URL}v1/products/${storeId}/delete/${productId}`
  },

  // Subscriptions endpoints
  SUBSCRIPTIONS: {
    CREATE: `${API_URL}v1/subscriptions/create`,
    GET_BY_BRAND: (brandId: string) => `${API_URL}v1/subscriptions/brand/${brandId}`,
    GET_BY_ID: (subscriptionId: string) => `${API_URL}v1/subscriptions/getById/${subscriptionId}`,
    UPDATE: (subscriptionId: string) => `${API_URL}v1/subscriptions/update/${subscriptionId}`,
    DELETE: (subscriptionId: string) => `${API_URL}v1/subscriptions/delete/${subscriptionId}`
  },

  // Subscriptions assignments endpoints
  SUBSCRIPTIONS_ASSIGNMENTS: {
    CREATE: `${API_URL}v1/subscriptions-assignments/create`,
    GET_BY_BRAND: (brandId: string) => `${API_URL}v1/subscriptions-assignments/brand/${brandId}`,
    GET_BY_CLIENT: (clientId: string) => `${API_URL}v1/subscriptions-assignments/client/${clientId}`,
    GET_BY_ID: (assignmentId: string) => `${API_URL}v1/subscriptions-assignments/getById/${assignmentId}`,
    UPDATE: (assignmentId: string) => `${API_URL}v1/subscriptions-assignments/update/${assignmentId}`,
    DELETE: (assignmentId: string) => `${API_URL}v1/subscriptions-assignments/delete/${assignmentId}`
  },

  // Sales endpoints
  SALES: {
    CREATE: `${API_URL}v1/sales/create`,
    GET_ALL: (storeId: string) => `${API_URL}v1/sales/${storeId}/getAll`,
    GET_BY_ID: (storeId: string, saleId: string) => `${API_URL}v1/sales/${storeId}/getById/${saleId}`,
    STATS: (storeId: string) => `${API_URL}v1/sales/${storeId}/stats/summary`,
    UPDATE_STATUS: (storeId: string, saleId: string) => `${API_URL}v1/sales/${storeId}/${saleId}/status`
  },

  // Schedules endpoints
  SCHEDULES: {
    CREATE: `${API_URL}v1/schedules/create`,
    GET_ALL: (storeId: string) => `${API_URL}v1/schedules/${storeId}/getAll`,
    GET_BY_ID: (storeId: string, scheduleId: string) => `${API_URL}v1/schedules/${storeId}/getById/${scheduleId}`,
    GET_BY_USER_ID: (storeId: string, userId: string) => `${API_URL}v1/schedules/${storeId}/getByUserId/${userId}`,
    UPDATE: (storeId: string, scheduleId: string) => `${API_URL}v1/schedules/${storeId}/update/${scheduleId}`,
    DELETE: (storeId: string, scheduleId: string) => `${API_URL}v1/schedules/${storeId}/delete/${scheduleId}`
  },

  // Diets endpoints
  DIETS: {
    CREATE: `${API_URL}v1/diets/create`,
    GET_ALL: (clientId: string) => `${API_URL}v1/diets/${clientId}/getAll`,
    GET_BY_ID: (clientId: string, dietId: string) => `${API_URL}v1/diets/${clientId}/getById/${dietId}`,
    UPDATE: (clientId: string, dietId: string) => `${API_URL}v1/diets/${clientId}/update/${dietId}`,
    DELETE: (clientId: string, dietId: string) => `${API_URL}v1/diets/${clientId}/delete/${dietId}`
  },

  // Analytics endpoints
  ANALYTICS: {
    PRODUCTS_TOP_SELLING: `${API_URL}v1/analytics/products/top-selling`,
    SUBSCRIPTIONS_MOST_ACQUIRED: `${API_URL}v1/analytics/subscriptions/most-acquired`,
    REVENUE_BY_PERIOD: `${API_URL}v1/analytics/revenue/by-period`,
    DASHBOARD_SUMMARY: `${API_URL}v1/analytics/dashboard/summary`,
    SALES_BY_PAYMENT_METHOD: `${API_URL}v1/analytics/sales/by-payment-method`,
    REVENUE_BY_CATEGORY: `${API_URL}v1/analytics/revenue/by-category`,
    CLIENTS_TOP_BUYERS: `${API_URL}v1/analytics/clients/top-buyers`,
    SUBSCRIPTIONS_EXPIRING_SOON: `${API_URL}v1/analytics/subscriptions/expiring-soon`
  }

};
