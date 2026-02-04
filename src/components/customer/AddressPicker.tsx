import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Edit2, X, AlertCircle } from 'lucide-react'
import { initGoogleMaps, calculateDistance, geocodeAddress } from '@/lib/mapsClient'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '../common/LoadingSpinner'
import Button from '../common/Button'

interface AddressPickerProps {
  value?: string
  coordinates?: { lat: number; lng: number }
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void
  onDistanceCalculated?: (distance: number) => void
  disabled?: boolean
}

const AddressPicker: React.FC<AddressPickerProps> = ({
  value = '',
  coordinates,
  onChange,
  onDistanceCalculated,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [isManualAddress, setIsManualAddress] = useState(false)
  const [manualAddress, setManualAddress] = useState(value)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    fetchStoreLocation()
  }, [])

  useEffect(() => {
    if (showMap && mapRef.current && !map) {
      initializeMap()
    }
  }, [showMap, map])

  const fetchStoreLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('store_coordinates')
        .single()
      
      if (error) throw error
      
      if (data?.store_coordinates) {
        const coords = data.store_coordinates as any
        setStoreLocation({
          lng: coords.coordinates[0],
          lat: coords.coordinates[1],
        })
      }
    } catch (error) {
      console.error('Failed to fetch store location:', error)
    }
  }

  const initializeMap = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const google = await initGoogleMaps()
      
      if (!mapRef.current) return
      
      const defaultLocation = coordinates || storeLocation || { lat: 13.736717, lng: 100.523186 } // Bangkok
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      })
      
      const markerInstance = new google.maps.Marker({
        map: mapInstance,
        position: defaultLocation,
        draggable: true,
        title: 'Drag to set your location',
      })
      
      // Add click listener to map
      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          markerInstance.setPosition(e.latLng)
          reverseGeocode(e.latLng.lat(), e.latLng.lng())
        }
      })
      
      // Add drag end listener to marker
      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition()
        if (position) {
          reverseGeocode(position.lat(), position.lng())
        }
      })
      
      setMap(mapInstance)
      setMarker(markerInstance)
      
      // Geocode current position if available
      if (coordinates) {
        reverseGeocode(coordinates.lat, coordinates.lng)
      } else {
        getCurrentLocation()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load map')
      setIsManualAddress(true)
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    
    setIsLoading(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        if (map && marker) {
          const latLng = new google.maps.LatLng(latitude, longitude)
          map.setCenter(latLng)
          marker.setPosition(latLng)
          await reverseGeocode(latitude, longitude)
        }
        
        setIsLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError('Unable to get your location. Please enable location services.')
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const google = await initGoogleMaps()
      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const address = results[0].formatted_address
          onChange(address, { lat, lng })
          
          if (storeLocation) {
            const distance = calculateDistance(lat, lng, storeLocation.lat, storeLocation.lng)
            onDistanceCalculated?.(distance)
          }
        } else {
          setError('Could not find address for this location')
        }
      })
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
  }

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.trim()) {
      setError('Please enter an address')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const coords = await geocodeAddress(manualAddress)
      
      if (coords) {
        onChange(manualAddress, coords)
        
        if (storeLocation) {
          const distance = calculateDistance(
            coords.lat,
            coords.lng,
            storeLocation.lat,
            storeLocation.lng
          )
          onDistanceCalculated?.(distance)
        }
      } else {
        onChange(manualAddress)
        onDistanceCalculated?.(0)
      }
      
      setShowMap(false)
    } catch (error) {
      setError('Could not find this address. Please check and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseCurrentLocation = () => {
    setIsManualAddress(false)
    getCurrentLocation()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Delivery Address
        </label>
        {!isManualAddress && (
          <button
            type="button"
            onClick={() => setIsManualAddress(true)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
            disabled={disabled}
          >
            <Edit2 className="w-4 h-4" />
            Enter manually
          </button>
        )}
      </div>
      
      {isManualAddress ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter your full address"
              className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManualAddress(false)}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleManualAddressSubmit}
              loading={isLoading}
              disabled={disabled || !manualAddress.trim()}
            >
              Use This Address
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={disabled}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="relative border border-input rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors"
            onClick={() => setShowMap(true)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {value ? (
                    <p className="text-sm text-foreground">{value}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tap to select delivery location on map
                    </p>
                  )}
                  {coordinates && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Location: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={disabled}
            className="w-full"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>
        </div>
      )}
      
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {showMap && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Select Delivery Location</h3>
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <LoadingSpinner text="Loading map..." />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      ref={mapRef}
                      className="w-full h-96 rounded-lg border border-input overflow-hidden"
                    />
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Drag the marker or click on the map to set your location
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowMap(false)}
                      >
                        Confirm Location
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddressPicker
