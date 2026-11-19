import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const SITE = 'https://sign.nexgn.cloud'
const indexPath = join(DIST, 'index.html')

if (!existsSync(indexPath)) {
  console.error('postbuild: dist/index.html not found. Run vite build first.')
  process.exit(1)
}

const baseHtml = readFileSync(indexPath, 'utf8')

// Public routes only. Paths must match AppRoutes.jsx.
const ROUTES = {
  login: {
    title: 'Log in | Nexgn Agreement Platform',
    desc: 'Sign in to your Nexgn workspace to prepare, send, sign, and track agreements securely.',
    priority: '0.8',
  },
  signup: {
    title: 'Create Free Account | Nexgn Agreement Platform',
    desc: 'Sign up for Nexgn to send documents for electronic signature, build reusable templates, and track audit trails.',
    priority: '0.9',
  },
  'forgot-password': {
    title: 'Reset Password | Nexgn Agreement Platform',
    desc: 'Request a secure password reset link to regain access to your Nexgn workspace.',
    priority: '0.4',
  },
  pricing: {
    title: 'Pricing & Plans | Nexgn Agreement Platform',
    desc: 'Compare Nexgn plans for sending e-signature envelopes, managing templates, and collaborating with your team.',
    priority: '1.0',
  },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function setTag(html, regex, tag) {
  return regex.test(html) ? html.replace(regex, tag) : html.replace('</head>', `  ${tag}\n</head>`)
}

function buildPage(html, route, meta) {
  const url = `${SITE}/${route}`
  let out = html
  out = setTag(out, /<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`)
  out = setTag(out, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(meta.desc)}" />`)
  out = setTag(out, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`)
  out = setTag(out, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(meta.title)}" />`)
  out = setTag(out, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(meta.desc)}" />`)
  out = setTag(out, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`)
  out = setTag(out, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${esc(meta.title)}" />`)
  out = setTag(out, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${esc(meta.desc)}" />`)
  return out
}

// 1) SPA fallback for GitHub Pages
writeFileSync(join(DIST, '404.html'), baseHtml)

// 2) Prerender public routes
for (const [route, meta] of Object.entries(ROUTES)) {
  const dir = join(DIST, route)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), buildPage(baseHtml, route, meta))
}

// 3) Generate sitemap.xml
const today = new Date().toISOString().split('T')[0]
const sitemapEntries = [
  `  <url>\n    <loc>${SITE}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
  ...Object.entries(ROUTES).map(
    ([route, meta]) =>
      `  <url>\n    <loc>${SITE}/${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${meta.priority}</priority>\n  </url>`,
  ),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap)

console.log(`postbuild: 404.html, sitemap.xml + ${Object.keys(ROUTES).length} prerendered routes`)