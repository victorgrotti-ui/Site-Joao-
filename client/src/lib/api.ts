export class ApiError extends Error {
  status: number
  code?: string
  details?: Record<string, string>
  outstandingPence?: number

  constructor(
    status: number,
    message: string,
    extra?: { code?: string; details?: Record<string, string>; outstandingPence?: number },
  ) {
    super(message)
    this.status = status
    this.code = extra?.code
    this.details = extra?.details
    this.outstandingPence = extra?.outstandingPence
  }
}

let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  allowUnauthorized?: boolean
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, allowUnauthorized, headers, ...rest } = options
  const response = await fetch(path, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null
  if (response.status === 401 && !allowUnauthorized) onUnauthorized()
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || 'Something went wrong. Please try again.', {
      code: payload?.code,
      details: payload?.details,
      outstandingPence: payload?.outstandingPence,
    })
  }
  return payload as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.details) return error.details
  return {}
}

export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(path, { credentials: 'include' })
  if (response.status === 401) onUnauthorized()
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(response.status, payload?.error || 'The report could not be exported.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
