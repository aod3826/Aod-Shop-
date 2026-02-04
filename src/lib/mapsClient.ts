import { Loader } from '@googlemaps/js-api-loader'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key not configured')
}

let mapsLoader: Loader | null = null
let mapsLoaded = false

export const initGoogleMaps = async (): Promise<typeof google> => {
  if (mapsLoaded) {
    return google
  }
  
  if (!mapsLoader) {
    mapsLoader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
      language: 'th',
      region: 'TH',
    })
  }
  
  try {
    const google = await mapsLoader.load()
    mapsLoaded = true
    return google
  } catch (error) {
    console.error('Failed to load Google Maps:', error)
    throw new Error('Google Maps failed to load. Please try again later.')
  }
}

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  // Haversine formula
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distance in km
}

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const google = await initGoogleMaps()
    const geocoder = new google.maps.Geocoder()
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng(),
          })
        } else {
          reject(new Error(`Geocode failed: ${status}`))
        }
      })
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}
