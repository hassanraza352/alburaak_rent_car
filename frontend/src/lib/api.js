const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'ab_admin_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
export const api = {
  getCars: async () => (await request('/cars')).map(c => ({...c, id:c._id || c.id})),
  importCars: async (cars) => request('/cars/import',{method:'POST',body:JSON.stringify({cars})}),
  createCar: async (car) => { const c=await request('/cars',{method:'POST',body:JSON.stringify(car)});return {...c,id:c._id}; },
  updateCar: async (id,car) => { const c=await request(`/cars/${id}`,{method:'PUT',body:JSON.stringify(car)});return {...c,id:c._id}; },
  deleteCar: (id) => request(`/cars/${id}`,{method:'DELETE'}),
  uploadImage: async (file) => {const form=new FormData();form.append('image',file);const result=await request('/cars/upload',{method:'POST',body:form});if(result.url?.startsWith('/'))result.url=`${API_BASE.replace(/\/api$/,'')}${result.url}`;return result;},
  login: (username,password) => request('/auth/login',{method:'POST',body:JSON.stringify({username,password})}),
  getBookings: () => request('/bookings'),
  createBooking: (booking) => request('/bookings',{method:'POST',body:JSON.stringify(booking)}),
  updateBooking: (id,patch) => request(`/bookings/${id}`,{method:'PATCH',body:JSON.stringify(patch)}),
  deleteBooking: (id) => request(`/bookings/${id}`,{method:'DELETE'}),
  getSettings: () => request('/settings'),
  saveSettings: (settings) => request('/settings',{method:'PUT',body:JSON.stringify(settings)}),
};
