class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = ''
  ) {
    super(message)

    this.statusCode = statusCode
    this.success = false
    this.errors = errors
    this.data = null

    if (stack) {
      this.stack = stack // Use provided stack trace if available (e.g., from another error)
    } else {
      Error.captureStackTrace(this, this.constructor) // Capture stack trace for debugging (excluding constructor)
    }
  }
}

export { ApiError }