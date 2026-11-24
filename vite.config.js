import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (command === 'build' && process.env.VERCEL === '1' && (!url || !key)) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.')
  }
  if (key?.startsWith('sb_secret_')) {
    throw new Error('Use a chave publishable do Supabase para o navegador.')
  }
  if (key?.split('.').length === 3) {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
    if (claims.role !== 'anon') throw new Error('Use a chave publishable ou a chave anon legada.')
  }
  return {}
})
