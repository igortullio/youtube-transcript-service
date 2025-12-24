import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  X_API_KEY: z.hash('sha256'),
  PROXY_URL: z.url(),
  YOUTUBE_COOKIES: z.string().min(1),
  SERVER_PORT: z.coerce.number().default(3000),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('❌ Invalid environment variables', z.treeifyError(_env.error))
  throw new Error('Invalid environment variables.')
}

export const env = {
  xApiKey: _env.data.X_API_KEY,
  proxyUrl: _env.data.PROXY_URL,
  youtubeCookies: _env.data.YOUTUBE_COOKIES,
  port: _env.data.SERVER_PORT,
} as const
