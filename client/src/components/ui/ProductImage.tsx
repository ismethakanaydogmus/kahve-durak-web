import { CupIcon, GlassIcon, IcedIcon, TeaIcon } from './icons'

const icons = [CupIcon, IcedIcon, GlassIcon, TeaIcon]

/** Product photo, or a category drawing on crema when there is none. */
export function ProductImage({ src, alt, categoryIndex, className = '' }: {
  src: string | null
  alt: string
  categoryIndex: number
  className?: string
}) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  const Icon = icons[Math.max(0, categoryIndex) % icons.length]
  return (
    <div aria-hidden className={`grid place-items-center bg-crema text-bean/70 ${className}`}>
      <Icon width={44} height={44} strokeWidth={1.3} />
    </div>
  )
}

export function CategoryIcon({ index, ...props }: { index: number; width?: number; height?: number; strokeWidth?: number }) {
  const Icon = icons[Math.max(0, index) % icons.length]
  return <Icon {...props} />
}
