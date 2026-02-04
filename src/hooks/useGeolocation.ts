import { useState, useEffect } from 'react'

interface GeolocationPosition {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: number
}

interface GeolocationError {
  code: number
  message: string
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const onSuccess = (pos: GeolocationPosition) => {
      setPosition(pos)
      setError(null)
      setIsLoading(false)
    }

    const onError = (err: GeolocationError) => {
      let message = 'Unknown error'
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          message = 'Permission denied. Please enable location services.'
          break
        case err.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.'
          break
        case err.TIMEOUT:
          message = 'Location request timed out.'
          break
      }
      
      setError(message)
      setIsLoading(false)
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { enableHighAccuracy, timeout, maximumAge }
    )

    // Watch for changes
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy, timeout, maximumAge }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enableHighAccuracy, timeout, maximumAge])

  const refresh = () => {
    setIsLoading(true)
    setError(null)
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos)
        setError(null)
        setIsLoading(false)
      },
      (err) => {
        let message = 'Unknown error'
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Permission denied'
            break
          case err.POSITION_UNAVAILABLE:
            message = 'Location unavailable'
            break
          case err.TIMEOUT:
            message = 'Request timeout'
            break
        }
        
        setError(message)
        setIsLoading(false)
      },
      { enableHighAccuracy, timeout, maximumAge }
    )
  }

  return {
    position,
    error,
    isLoading,
    refresh,
    coordinates: position?.coords ? {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    } : null,
  }
}
