import axios from 'axios'

// TODO 是不是可以直接返回data，而不是整个response对象
const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export default http
