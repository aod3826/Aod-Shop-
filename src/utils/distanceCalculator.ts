/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate shipping fee based on distance
 * @param distance Distance in kilometers
 * @param flatFee Base shipping fee
 * @param maxDistance Maximum delivery distance in kilometers
 * @returns Shipping fee or null if outside range
 */
export const calculateShippingFee = (
  distance: number,
  flatFee: number,
  maxDistance: number = 20
): number | null => {
  if (distance > maxDistance) {
    return null // Outside delivery range
  }
  
  // You can implement tiered pricing here
  // For now, return flat fee
  return flatFee
}

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

/**
 * Extract coordinates from PostGIS POINT string
 */
export const parsePostGISPoint = (point: string): { lat: number; lng: number } | null => {
  try {
    // POINT(lng lat)
    const match = point.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      }
    }
    return null
  } catch (error) {
    console.error('Failed to parse PostGIS point:', error)
    return null
  }
}

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} meters`
  }
  return `${distance.toFixed(2)} km`
}
