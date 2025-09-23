import { ApiResponse } from "../types/api";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}

export class ApiError extends Error {
	statusCode: number;
	constructor(message: string, statusCode = 400) {
	  super(message);
	  this.statusCode = statusCode;
	}
  }
