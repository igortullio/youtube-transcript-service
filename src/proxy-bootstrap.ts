import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { env } from './env/index.js'

export function applyProxyPatch() {
  try {
    const agent = new ProxyAgent(env.proxyUrl)

    const safeLog = env.proxyUrl.replace(/:([^:@]+)@/, ':***@')
    console.log(`🔗 Global Proxy Patch Applied: ${safeLog}`)

    // Sobrescreve o fetch global
    global.fetch = async (input: any, init?: any) => {
      const headers = new Headers(init?.headers)

      if (!headers.has('User-Agent')) {
        headers.set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        )
      }

      const fetchOptions = {
        ...init,
        headers,
        dispatcher: agent,
      }

      if (init?.body) {
        fetchOptions.duplex = 'half'
      }

      return undiciFetch(input, fetchOptions) as unknown as Promise<Response>
    }
  } catch (error) {
    console.error('❌ Failed to apply global proxy patch:', error)
  }
}
