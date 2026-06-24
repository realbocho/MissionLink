import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const tg = window.Telegram?.WebApp
  if (tg?.initData) {
    config.headers['x-telegram-init-data'] = tg.initData
  }
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

export default api
export const getMissions = (params) => api.get('/missions', { params })
export const getMission = (id) => api.get(`/missions/${id}`)
export const createMission = (data) => api.post('/missions', data)
export const updateMission = (id, data) => api.patch(`/missions/${id}`, data)
export const createDonation = (data) => api.post('/donations', data)
export const getMe = () => api.get('/users/me')
