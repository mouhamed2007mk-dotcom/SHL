export type CarCategory = 'اقتصادية' | 'سيدان' | 'SUV' | 'فاخرة' | 'عائلية'
export type Car = {
  id: string
  name: string
  category: CarCategory
  city: string
  dailyRate: number
  seats: number
  transmission: 'أوتوماتيك' | 'يدوي'
  image: string
  featured?: boolean
}
