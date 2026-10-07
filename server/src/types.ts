export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
