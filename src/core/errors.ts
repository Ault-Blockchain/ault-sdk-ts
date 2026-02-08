export class ApiError extends Error {
  status?: number;
  response?: string;

  constructor(message: string, status?: number, response?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

export class NetworkError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "NetworkError";
    this.originalError = originalError;
  }
}

export class TimeoutError extends Error {
  constructor(message: string = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}
