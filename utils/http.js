import axios from 'axios'
import config from '../app.config.js'
const instance = axios.create({
  baseURL: config.server,
  timeout: 60000
})

const http = () => {
  return {
    async request(method, url, data, headers) {
      return instance({ method, url, data, headers })
        .then((data) => {
          return data
        })
        .catch((err) => err)
    }
  }
}

export default http
