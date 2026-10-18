export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-bean text-foam hover:bg-bean-dark disabled:bg-muted/50',
  secondary: 'bg-crema text-bean hover:bg-crema-deep disabled:opacity-60',
  ghost: 'text-bean hover:bg-crema/60',
}

export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${extra}`
