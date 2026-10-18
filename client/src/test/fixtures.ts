import type { HomeDto, MenuCategoryDto, ProductDto } from '../lib/types'

const milk = {
  id: 10, nameTr: 'Süt', nameEn: 'Milk', isRequired: true, minSelect: 1, maxSelect: 1,
  options: [
    { id: 101, nameTr: 'Normal', nameEn: 'Regular', priceDelta: 0 },
    { id: 102, nameTr: 'Yulaf', nameEn: 'Oat', priceDelta: 30 },
  ],
}

export const espresso: ProductDto = {
  id: 1, categoryId: 1, nameTr: 'Espresso', nameEn: 'Espresso', descriptionTr: 'Yoğun espresso.', descriptionEn: 'Intense espresso.',
  price: 105, imageUrl: null, isAvailable: true, isFeatured: false,
  optionGroups: [{
    id: 1, nameTr: 'Boy', nameEn: 'Size', isRequired: true, minSelect: 1, maxSelect: 1,
    options: [{ id: 11, nameTr: 'Single', nameEn: 'Single', priceDelta: 0 }, { id: 12, nameTr: 'Double', nameEn: 'Double', priceDelta: 15 }],
  }],
}

export const latte: ProductDto = {
  id: 2, categoryId: 1, nameTr: 'Latte', nameEn: 'Latte', descriptionTr: 'Bol sütlü.', descriptionEn: 'Milky.',
  price: 180, imageUrl: null, isAvailable: true, isFeatured: true, optionGroups: [milk],
}

/** EN name intentionally empty to exercise the TR fallback. */
export const lotus: ProductDto = {
  id: 3, categoryId: 1, nameTr: 'Lotuslu Sıcak Çikolata', nameEn: '', descriptionTr: 'Lotus bisküvili.', descriptionEn: null,
  price: 200, imageUrl: null, isAvailable: true, isFeatured: true, optionGroups: [],
}

export const coldBrew: ProductDto = {
  id: 4, categoryId: 2, nameTr: 'Cold Brew', nameEn: 'Cold Brew', descriptionTr: 'Soğuk demleme.', descriptionEn: 'Cold steeped.',
  price: 220, imageUrl: null, isAvailable: true, isFeatured: true, optionGroups: [],
}

export const soda: ProductDto = {
  id: 5, categoryId: 3, nameTr: 'Soda', nameEn: 'Sparkling Water', descriptionTr: 'Maden suyu.', descriptionEn: 'Mineral water.',
  price: 70, imageUrl: null, isAvailable: false, isFeatured: false, optionGroups: [],
}

export const tea: ProductDto = {
  id: 6, categoryId: 4, nameTr: 'Çay', nameEn: 'Turkish Tea', descriptionTr: 'Taze demlenmiş.', descriptionEn: 'Fresh.',
  price: 50, imageUrl: null, isAvailable: true, isFeatured: false, optionGroups: [],
}

export const menuFixture: MenuCategoryDto[] = [
  { id: 1, nameTr: 'Sıcak İçecekler', nameEn: 'Hot Drinks', imageUrl: null, products: [espresso, latte, lotus] },
  { id: 2, nameTr: 'Soğuk Kahveler', nameEn: 'Iced Coffees', imageUrl: null, products: [coldBrew] },
  { id: 3, nameTr: 'Soğuk İçecekler', nameEn: 'Cold Drinks', imageUrl: null, products: [soda] },
  { id: 4, nameTr: 'Çaylar', nameEn: 'Teas', imageUrl: null, products: [tea] },
]

export const homeFixture: HomeDto = {
  slides: [
    { id: 1, titleTr: 'Mahallenin kahve durağı', titleEn: 'Your neighborhood coffee stop', subtitleTr: 'Mahalle kahvecisi.', subtitleEn: 'Neighborhood café.', imageUrl: '/seed/slide-1.svg', linkUrl: '/menu' },
    { id: 2, titleTr: 'Soğuk kahve sezonu: Cold Brew', titleEn: 'Iced coffee season: Cold Brew', subtitleTr: null, subtitleEn: null, imageUrl: '/seed/slide-2.svg', linkUrl: '/menu' },
    { id: 3, titleTr: "Üsküdar'da kapına", titleEn: 'To your door in Üsküdar', subtitleTr: null, subtitleEn: null, imageUrl: '/seed/slide-3.svg', linkUrl: null },
  ],
  categories: menuFixture.map((c) => ({ ...c, products: [] })),
  featured: [latte, lotus, coldBrew],
  testimonials: [
    { id: 1, authorName: 'Elif K.', text: "Mahallenin en iyi latte'si.", rating: 5 },
    { id: 2, authorName: 'Mert A.', text: 'Cold Brew favorim.', rating: 4 },
  ],
  shop: {
    name: "Kahve Durak",
    address: 'Bulgurlu, Demlik Sk. No:4A, 34696 Üsküdar/İstanbul',
    phone: '+90 555 000 0000',
    mapEmbedUrl: 'https://www.google.com/maps?q=uskudar&output=embed',
    openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: '10:00', closes: '03:00', isClosed: false })),
    status: { isOpen: true, closesAt: '2026-10-20T00:00:00+00:00', nextOpensAt: null },
    deliveryFee: 30,
    minOrderAmount: 200,
  },
}
