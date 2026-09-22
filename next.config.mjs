/**
 * @type {import('next').NextConfig}
 *
 * AuthePay production configuration.
 *
 * - Webpack is used explicitly for both `dev` and `build` because Turbopack is
 *   not supported in this deployment toolchain (see package.json scripts).
 * - `output: "standalone"` keeps a self-contained Node server for traditional
 *   deployments, while `open-next build` produces the Cloudflare Pages bundle
 *   from the same `.next` output (see open-next.config.ts / wrangler.toml).
 * - The `externalPackages` list prevents bundling native/server-only modules.
 */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@supabase/supabase-js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            // Pragmatic CSP: Next.js emits inline bootstrap scripts, so
            // script-src keeps 'unsafe-inline'; the value here comes from
            // restricting object/base/frame/form directives and connection
            // targets. connect-src is limited to the API origin and Supabase.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
