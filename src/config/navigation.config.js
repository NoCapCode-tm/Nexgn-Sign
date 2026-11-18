import { BookUser, CircleHelp, FileText, House, LayoutTemplate, PenLine, Settings } from 'lucide-react'

export const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: House },
  { to: '/documents', label: 'Documents', Icon: FileText },
  { to: '/signers', label: 'Signers', Icon: PenLine }, // no /signers page yet: add a route or remove this line
  { to: '/templates', label: 'Templates', Icon: LayoutTemplate },
  { to: '/contacts', label: 'Contact Book', Icon: BookUser },
]

export const SECONDARY_NAV = [
  { to: '/settings', label: 'Settings', Icon: Settings },
  { href: 'https://nexgn.cloud/en/help', label: 'Help', Icon: CircleHelp }, // point this at your help centre
]