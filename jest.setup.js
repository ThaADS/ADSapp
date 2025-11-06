import '@testing-library/jest-dom'

// =============================================================================
// Console Mocking (suppress expected warnings in tests)
// =============================================================================

const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// =============================================================================
// Test Cleanup
// =============================================================================

afterEach(() => {
  jest.clearAllMocks()
})

// =============================================================================
// Next.js Mocking
// =============================================================================

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
})

// =============================================================================
// Next.js Web API Mocking (Request/Response for API tests)
// =============================================================================

// Mock fetch API globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  })
)

// Mock Request and Response for Next.js API routes
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input.url
      this._method = init.method || 'GET'
      this._headers = new Headers(init.headers || {})
      this._body = init.body || null
      this._bodyInit = init.body
      this._cache = init.cache || 'default'
      this._credentials = init.credentials || 'same-origin'
      this._integrity = init.integrity || ''
      this._keepalive = init.keepalive || false
      this._mode = init.mode || 'cors'
      this._redirect = init.redirect || 'follow'
      this._referrer = init.referrer || 'about:client'
      this._referrerPolicy = init.referrerPolicy || ''
      this._signal = init.signal || null
    }

    get url() {
      return this._url
    }

    get method() {
      return this._method
    }

    get headers() {
      return this._headers
    }

    get body() {
      return this._body
    }

    get bodyUsed() {
      return false
    }

    get cache() {
      return this._cache
    }

    get credentials() {
      return this._credentials
    }

    get destination() {
      return ''
    }

    get integrity() {
      return this._integrity
    }

    get keepalive() {
      return this._keepalive
    }

    get mode() {
      return this._mode
    }

    get redirect() {
      return this._redirect
    }

    get referrer() {
      return this._referrer
    }

    get referrerPolicy() {
      return this._referrerPolicy
    }

    get signal() {
      return this._signal
    }

    async json() {
      return this._bodyInit ? JSON.parse(this._bodyInit) : {}
    }

    async text() {
      return this._bodyInit || ''
    }

    async arrayBuffer() {
      return new ArrayBuffer(0)
    }

    async blob() {
      return new Blob([this._bodyInit || ''])
    }

    async formData() {
      return new FormData()
    }

    clone() {
      return new Request(this._url, {
        method: this._method,
        headers: this._headers,
        body: this._bodyInit,
        cache: this._cache,
        credentials: this._credentials,
        integrity: this._integrity,
        keepalive: this._keepalive,
        mode: this._mode,
        redirect: this._redirect,
        referrer: this._referrer,
        referrerPolicy: this._referrerPolicy,
        signal: this._signal,
      })
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers || {})
      this.ok = this.status >= 200 && this.status < 300
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      })
    }

    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      })
    }
  }
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = {}
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = value
        })
      }
    }

    get(name) {
      return this._headers[name.toLowerCase()] || null
    }

    set(name, value) {
      this._headers[name.toLowerCase()] = value
    }

    has(name) {
      return name.toLowerCase() in this._headers
    }

    delete(name) {
      delete this._headers[name.toLowerCase()]
    }

    entries() {
      return Object.entries(this._headers)
    }

    keys() {
      return Object.keys(this._headers)
    }

    values() {
      return Object.values(this._headers)
    }

    forEach(callback) {
      Object.entries(this._headers).forEach(([key, value]) => callback(value, key, this))
    }
  }
}
