import { NavLink, Outlet } from 'react-router-dom'

const TABS = ['profile', 'account', 'security', 'notifications', 'billing', 'integrations', 'team', 'audit-logs', 'recycle-bin']

export default function SettingsLayout() {
  return (
    <div>
      <h1>Settings</h1>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1rem 0' }}>
        {TABS.map((t) => (
          <NavLink key={t} to={t} style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400 })}>
            {t.replace('-', ' ')}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}