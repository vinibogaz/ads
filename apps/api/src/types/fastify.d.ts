import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; tid: string; role: string }
    user: { sub: string; tid: string; role: string }
  }
}

export {}
