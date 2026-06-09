import React from 'react'

interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Avatar: React.FC<AvatarProps> = ({ name, color = '#E8A87C', size = 'md', className = '' }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  return (
    <div
      className={`avatar avatar-${size} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  )
}

export default Avatar
