import type { Car, CarCategory } from '../types'
import { requireSupabase } from '../lib/supabase'

type DatabaseCar = {
  id: string
  name: string
  category: string
  city: string
  daily_rate: number | string
  seats: number
  transmission: string
  image_url: string | null
  images: string[] | null
}

export async function fetchCars(): Promise<Car[]> {
  const client = requireSupabase()

  const { data, error } = await client
    .from('cars')
    .select(
      'id, name, category, city, daily_rate, seats, transmission, image_url, images',
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load SHL cars:', error.message)
    throw new Error('تعذّر تحميل السيارات من قاعدة البيانات.')
  }

  return (data ?? []).map((car) => {
    const row = car as DatabaseCar

    return {
      id: row.id,
      name: row.name,
      category: row.category as CarCategory,
      city: row.city,
      dailyRate: Number(row.daily_rate),
      seats: row.seats,
      transmission: row.transmission as Car['transmission'],
      image:
        row.image_url ||
        row.images?.[0] ||
        'https://placehold.co/1200x800?text=SHL',
    }
  })
}