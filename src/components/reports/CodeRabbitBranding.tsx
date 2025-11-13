import { useTheme } from '@/components/theme/ThemeProvider'

interface CodeRabbitIconProps {
  className?: string
}

export function CodeRabbitIcon({ className = 'h-4 w-4' }: CodeRabbitIconProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <img
      src={
        isDark
          ? '/coderabbit/coderabbit-dark-icon.svg'
          : '/coderabbit/coderabbit-light-icon.svg'
      }
      alt="CodeRabbit"
      className={className}
    />
  )
}

interface CodeRabbitLogoProps {
  className?: string
}

export function CodeRabbitLogo({ className = 'h-4' }: CodeRabbitLogoProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <img
      src={
        isDark
          ? '/coderabbit/coderabbit-dark-logo.svg'
          : '/coderabbit/coderabbit-light-logo.svg'
      }
      alt="CodeRabbit"
      className={className}
    />
  )
}
