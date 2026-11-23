const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'howlat.token'

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(t: string) {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

export class ApiError extends Error {
  status: number
  code: string
  fieldErrors: Record<string, string>
  constructor(status: number, message: string, code = 'error', fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
  get isNetwork() { return this.status === 0 }
  get isRetryable() { return this.status === 0 || this.status === 503 || this.status === 502 || this.status === 504 }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn }

type Query = Record<string, string | number | boolean | null | undefined | string[]>

function qs(params?: Query): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x))
    else sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function request(method: string, path: string, opts: { body?: unknown; params?: Query; headers?: Record<string, string>; auth?: boolean } = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}/api/v1${path}${qs(opts.params)}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.", 'network')
  }

  if (!res.ok) {
    let detail = 'Something went wrong. Please try again.'
    let code = 'error'
    const fields: Record<string, string> = {}
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
      if (data.code) code = data.code
      if (Array.isArray(data.errors)) for (const e of data.errors) if (e.field) fields[e.field] = e.message
    } catch { /* non-JSON error body */ }
    if (res.status === 401 && opts.auth !== false) onUnauthorized?.()
    throw new ApiError(res.status, detail, code, fields)
  }
  return res
}

async function json<T>(method: string, path: string, opts?: Parameters<typeof request>[2]): Promise<T> {
  const res = await request(method, path, opts)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, params?: Query) => json<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>, auth = true) => json<T>('POST', path, { body: body ?? {}, headers, auth }),
  patch: <T>(path: string, body: unknown) => json<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => json<T>('DELETE', path),

  /** Downloads a binary/text response and hands it to the browser as a file. */
  async download(path: string, params: Query, fallbackName: string) {
    const res = await request('GET', path, { params })
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? fallbackName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

/** A fresh key per form-open; resubmitting the same form (double click, retry) reuses it so the server de-duplicates. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
