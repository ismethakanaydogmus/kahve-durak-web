import type { SVGProps } from 'react'

const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const CartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 8h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
)
export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" /></svg>
)
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const CupIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8.5 3.5c-.6 1 .6 1.6 0 2.6M12 3.5c-.6 1 .6 1.6 0 2.6" /></svg>
)
export const IcedIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 6h12l-1.6 13.2a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8L6 6Z" /><path d="m13 2.5-1.5 9" /><rect x="9" y="10" width="3" height="3" rx=".6" /><rect x="12.4" y="13" width="3" height="3" rx=".6" /></svg>
)
export const GlassIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M7 4h10l-1 15.2a2 2 0 0 1-2 1.8h-4a2 2 0 0 1-2-1.8L7 4Z" /><path d="M7.4 10h9.2" /><circle cx="11" cy="14" r=".6" /><circle cx="13.5" cy="16.5" r=".6" /></svg>
)
export const TeaIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M8 7h8l-.8 10.4a2.6 2.6 0 0 1-2.6 2.4h-1.2a2.6 2.6 0 0 1-2.6-2.4L8 7Z" /><path d="M8.6 11h6.8" /><path d="M5 21h14" /></svg>
)
