const BASE_URL = '/api';

const request = async (url, options = {}) => {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await response.json();
  return { ok: response.ok, data };
};

export const getRecipes = () => request('/recipes');

export const getIngredients = () => request('/ingredients');

export const getOrders = () => request('/orders');

export const createOrder = (orderData) =>
  request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });

export const getProductionPlans = (date) => {
  const query = date ? `?date=${date}` : '';
  return request(`/production-plans${query}`);
};

export const updateProductionPlan = (id, updates) =>
  request(`/production-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const reorderProductionPlans = (orders) =>
  request('/production-plans/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orders }),
  });

export const getWeeklyStats = () => request('/stats/weekly');

export const getInventoryAlerts = () => request('/inventory/alerts');
