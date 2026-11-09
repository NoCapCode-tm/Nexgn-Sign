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

// Public routes only. Paths must match the ones in AppRoutes.jsx.
const ROUTES = {
  login: {
    title: 'Log in | Nexgn Sign',
    desc: 'Log in to Nexgn Sign to send, sign and manage documents.',
  },
  signup: {
    title: 'Sign up | Nexgn Sign',
    desc: 'Create your free Nexgn Sign account.',
  },
  'forgot-password': {
    title: 'Reset password | Nexgn Sign',
    desc: 'Reset your Nexgn Sign password.',
  },
  pricing: {
    title: 'Pricing | Nexgn Sign',
    desc: 'Simple plans for e-signatures with Nexgn Sign.',
  },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Replace a tag if it exists, otherwise insert it before </head>
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
  return out
}

// 1) SPA fallback: GitHub Pages serves 404.html for unknown URLs (e.g. /documents/123)
writeFileSync(join(DIST, '404.html'), baseHtml)

// 2) Prerender public routes
for (const [route, meta] of Object.entries(ROUTES)) {
  const dir = join(DIST, route)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), buildPage(baseHtml, route, meta))
}

console.log(`postbuild: 404.html + ${Object.keys(ROUTES).length} prerendered routes`)