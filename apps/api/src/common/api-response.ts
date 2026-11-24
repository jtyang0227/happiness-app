import { localDateTime } from './time.js';

/**
 * Spring `exception/ApiResponse`와 같은 모양. data·message가 null이면 키를 빼고(@JsonInclude NON_NULL),
 * timestamp는 응답을 만든 시각.
 */
export function ok<T>(data?: T) {
  const body: Record<string, unknown> = { success: true, code: '200', message: '성공' };
  if (data !== undefined && data !== null) body.data = data;
  body.timestamp = localDateTime(new Date());
  return body;
}

export function fail(code: string, message: string) {
  return { success: false, code, message, timestamp: localDateTime(new Date()) };
}
