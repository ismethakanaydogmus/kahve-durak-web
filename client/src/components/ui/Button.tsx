import type { ButtonHTMLAttributes } from 'react'
import type { ButtonVariant } from './buttonClass'
import { buttonClass } from './buttonClass'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />
}
