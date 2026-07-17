export async function GET(request: Request, { env }: any) {
  const checks: any = {}

  // Check 1: Is AI binding active?
  checks.ai_binding = !!env.AI

  // Check 2: Try to call AI
  if (env.AI) {
    try {
      const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a deployment debugger. Check if wrangler.toml has AI binding and pages_build_output_dir' },
          { role: 'user', content: 'Is Cloudflare AI active? Reply with OK if yes' }
        ],
        max_tokens: 50
      })
      checks.ai_response = aiRes.response
    } catch (e: any) {
      checks.ai_error = e.message
    }
  }

  // Check 3: Check env vars
  checks.node_version = process.version
  checks.env = Object.keys(env)

  return Response.json({
    status: checks.ai_binding ? "AI BINDING ACTIVE ✅" : "AI BINDING MISSING ❌",
    debug: checks,
    time: new Date().toISOString()
  })
}
