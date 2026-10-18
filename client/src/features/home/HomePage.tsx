import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { CategoryGrid } from './CategoryGrid'
import { ContactSection } from './ContactSection'
import { FeaturedProducts } from './FeaturedProducts'
import { HeroSlider } from './HeroSlider'
import { HowItWorks } from './HowItWorks'
import { ShopStatusBadge } from './ShopStatusBadge'
import { Testimonials } from './Testimonials'
import { useHome } from './useHome'
import { useHashScroll } from '../../lib/useHashScroll'

export function HomePage() {
  const { data, isPending, isError, refetch } = useHome()
  useHashScroll(data !== undefined)

  if (isPending) {
    return (
      <LoadingRegion>
        <Skeleton className="h-[68vh] max-h-[760px] min-h-[420px] rounded-none" />
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-3 px-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </LoadingRegion>
    )
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <>
      <h1 className="sr-only">Kahve Durak Üsküdar</h1>
      <HeroSlider slides={data.slides} />
      <div className="relative z-10 mx-auto -mt-6 flex max-w-6xl px-4">
        <ShopStatusBadge status={data.shop.status} />
      </div>
      <CategoryGrid categories={data.categories} />
      <FeaturedProducts products={data.featured} categories={data.categories} />
      <HowItWorks />
      <Testimonials items={data.testimonials} />
      <ContactSection shop={data.shop} />
    </>
  )
}
