// Mirrors api/KahveDurak.Api/Features/Catalog/CatalogDtos.cs and Features/Auth/AuthDtos.cs.

export interface OptionDto {
  id: number
  nameTr: string
  nameEn: string | null
  priceDelta: number
}

export interface OptionGroupDto {
  id: number
  nameTr: string
  nameEn: string | null
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: OptionDto[]
}

export interface ProductDto {
  id: number
  categoryId: number
  nameTr: string
  nameEn: string | null
  descriptionTr: string | null
  descriptionEn: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  isFeatured: boolean
  optionGroups: OptionGroupDto[]
}

export interface MenuCategoryDto {
  id: number
  nameTr: string
  nameEn: string | null
  imageUrl: string | null
  products: ProductDto[]
}

export interface SlideDto {
  id: number
  titleTr: string
  titleEn: string | null
  subtitleTr: string | null
  subtitleEn: string | null
  imageUrl: string
  linkUrl: string | null
}

export interface TestimonialDto {
  id: number
  authorName: string
  text: string
  rating: number
}

/** day: 0 = Sunday … 6 = Saturday; times "HH:mm" Istanbul local. */
export interface OpeningHourDto {
  day: number
  opens: string
  closes: string
  isClosed: boolean
}

/** ISO-8601 UTC strings or null. */
export interface ShopStatusDto {
  isOpen: boolean
  closesAt: string | null
  nextOpensAt: string | null
}

export interface ShopInfoDto {
  name: string
  address: string
  phone: string
  mapEmbedUrl: string
  openingHours: OpeningHourDto[]
  status: ShopStatusDto
  deliveryFee: number
  minOrderAmount: number
}

export interface HomeDto {
  slides: SlideDto[]
  categories: MenuCategoryDto[]
  featured: ProductDto[]
  testimonials: TestimonialDto[]
  shop: ShopInfoDto
}

export type Role = 'Customer' | 'Admin'

export interface UserDto {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
}

export interface AuthResponse {
  token: string
  user: UserDto
}

export interface ProblemDetails {
  title?: string
  status?: number
  errors?: Record<string, string[]>
}

// Mirrors api/.../Features/Addresses/AddressDtos.cs
export interface NeighborhoodDto {
  id: number
  name: string
}

export interface AddressDto {
  id: number
  title: string
  neighborhoodId: number
  neighborhoodName: string
  line: string
  directions: string | null
}

export interface AddressRequest {
  title: string
  neighborhoodId: number
  line: string
  directions?: string | null
}

// Mirrors api/.../Features/Orders/CheckoutDtos.cs
export type Fulfilment = 'Pickup' | 'Delivery'

export interface CheckoutItemRequest {
  productId: number
  optionIds: number[]
  quantity: number
}

export interface CheckoutRequest {
  items: CheckoutItemRequest[]
  fulfilment: Fulfilment
  addressId: number | null
  note: string | null
  lang: 'tr' | 'en'
}

export interface OptionNameDto {
  nameTr: string
  nameEn: string | null
}

export interface QuoteLineDto {
  productId: number
  nameTr: string
  nameEn: string | null
  options: OptionNameDto[]
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type QuoteErrorCode =
  | 'EMPTY_CART' | 'QUANTITY_INVALID' | 'PRODUCT_UNAVAILABLE' | 'OPTION_INVALID' | 'OPTION_REQUIRED' | 'SHOP_CLOSED'
  | 'ADDRESS_REQUIRED' | 'ADDRESS_INVALID' | 'NEIGHBORHOOD_NOT_SERVED' | 'BELOW_MINIMUM' | 'NOTE_TOO_LONG' | 'FULFILMENT_INVALID'

export interface QuoteDto {
  lines: QuoteLineDto[]
  subtotal: number
  deliveryFee: number
  total: number
  minOrderAmount: number
  errors: { code: QuoteErrorCode; productId: number | null }[]
  canOrder: boolean
}

export interface CreateOrderResponse {
  orderId: number
  paymentPageUrl: string
}

// Mirrors api/.../Features/Orders/OrderDtos.cs
export type OrderStatus =
  | 'PendingPayment' | 'PaymentFailed' | 'Received' | 'Preparing' | 'Ready' | 'OnTheWay' | 'Completed' | 'Cancelled'

export interface OrderSummaryDto {
  id: number
  status: OrderStatus
  fulfilment: Fulfilment
  total: number
  itemCount: number
  createdAt: string
}

export interface OrderDetailDto {
  id: number
  status: OrderStatus
  fulfilment: Fulfilment
  items: { nameTr: string; nameEn: string | null; options: OptionNameDto[]; unitPrice: number; quantity: number; lineTotal: number }[]
  subtotal: number
  deliveryFee: number
  total: number
  note: string | null
  address: { title: string; neighborhood: string; line: string; directions: string | null } | null
  history: { status: OrderStatus; at: string }[]
  createdAt: string
}

// Mirrors api/.../Features/Realtime and Features/Admin DTOs
export interface OrderStatusChangedDto {
  orderId: number
  status: OrderStatus
  at: string
}

export interface AdminOrderSummaryDto {
  id: number
  status: OrderStatus
  fulfilment: Fulfilment
  total: number
  itemCount: number
  createdAt: string
  customerName: string
  customerPhone: string
  neighborhood: string | null
}

export interface AdminOrderDetailDto {
  order: OrderDetailDto
  customer: { name: string; email: string; phone: string }
  next: OrderStatus | null
  canCancel: boolean
}

export interface DashboardDto {
  todayRevenue: number
  todayOrders: number
  averageBasket: number
  topProducts: { nameTr: string; quantity: number; revenue: number }[]
}

// Mirrors api/.../Features/Admin/Catalog/AdminCatalogDtos.cs
export interface AdminOptionDto { id: number; nameTr: string; nameEn: string | null; priceDelta: number }
export interface AdminOptionGroupDto {
  id: number; nameTr: string; nameEn: string | null; isRequired: boolean; maxSelect: number; options: AdminOptionDto[]
}
export interface AdminProductDto {
  id: number; categoryId: number; nameTr: string; nameEn: string | null; descriptionTr: string | null; descriptionEn: string | null
  price: number; imageUrl: string | null; isAvailable: boolean; isFeatured: boolean; optionGroups: AdminOptionGroupDto[]
}
export interface AdminCategoryDto {
  id: number; nameTr: string; nameEn: string | null; imageUrl: string | null; isActive: boolean; products: AdminProductDto[]
}

// Mirrors api/.../Features/Admin/Content/AdminContentDtos.cs
export interface AdminSlideDto {
  id: number; titleTr: string; titleEn: string | null; subtitleTr: string | null; subtitleEn: string | null
  imageUrl: string; linkUrl: string | null; isActive: boolean
}
export interface AdminTestimonialDto { id: number; authorName: string; text: string; rating: number; isPublished: boolean }

// Mirrors api/.../Features/Admin/Settings/AdminSettingsController.cs
export interface ShopSettingsDto {
  deliveryFee: number; minOrderAmount: number; phone: string; address: string; mapEmbedUrl: string
  openingHours: OpeningHourDto[]; neighborhoods: { id: number; name: string; isActive: boolean }[]
}
