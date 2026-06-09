type Route =
  | { name: 'home' }
  | { name: 'book'; id: string }
  | { name: 'profile'; id?: string }

interface HeaderProps {
  onNavigate: (path: string) => void
  currentRoute: Route
}

export default function Header({ onNavigate, currentRoute }: HeaderProps) {
  const isActive = (name: string) => currentRoute.name === name

  const linkStyle = (name: string) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: isActive(name) ? 600 : 400,
    color: isActive(name) ? '#F5E6CA' : '#8B5E3C',
    backgroundColor: isActive(name) ? '#8B5E3C' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    fontFamily: 'inherit',
  })

  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%)',
        boxShadow: '0 2px 12px rgba(107, 68, 35, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('/')}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="#F5E6CA"
          >
            <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
          </svg>
          <h1
            style={{
              color: '#F5E6CA',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '2px',
            }}
          >
            书香漂流
          </h1>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button style={linkStyle('home')} onClick={() => onNavigate('/')}>
            书架
          </button>
          <button
            style={linkStyle('profile')}
            onClick={() => onNavigate('/profile/user-1')}
          >
            我的书房
          </button>
        </nav>
      </div>
    </header>
  )
}
