class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = null) {
    this.success = statusCode < 400
    this.statusCode = statusCode
    this.message = message
    this.data = data
    this.meta = meta
    this.timestamp = new Date().toISOString()
  }
}

export { ApiResponse }
