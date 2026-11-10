import { getPasswordStrength } from '@/utils/passwordStrength'

export default function PasswordStrengthMeter({ password }) {
  const { score, label } = getPasswordStrength(password)
  
  const bars = [1, 2, 3, 4]
  const colors = ['#cbd5e1', '#d92d20', '#f59e0b', '#10b981', '#059669'] // 0=Empty, 1=Weak, 2=Fair, 3=Good, 4=Strong
  
  // Set the color based on the current score
  const activeColor = score > 0 ? colors[score] : colors[0]

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '6px', height: '4px' }}>
        {bars.map((index) => (
          <div 
            key={index}
            style={{
              flex: 1,
              borderRadius: '2px',
              backgroundColor: index <= score ? activeColor : '#e2e8f0', // e2e8f0 is a light slate empty state
              transition: 'background-color 0.3s ease'
            }}
          />
        ))}
      </div>
      <div style={{ minHeight: '18px', marginTop: '4px', textAlign: 'right' }}>
        {label && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: activeColor }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}