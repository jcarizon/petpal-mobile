import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { LocationState, Coordinates } from '../types';
import { setLocationPermission } from '../lib/storage';

export function useLocation() {
  const [locationState, setLocationState] = useState<LocationState>({
    coordinates: null,
    city: null,
    hasPermission: false,
    isLoading: false,
    error: null,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLocationState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      await setLocationPermission(granted);

      if (!granted) {
        setLocationState((prev) => ({
          ...prev,
          hasPermission: false,
          isLoading: false,
          error: 'Location permission denied',
        }));
        return false;
      }

      setLocationState((prev) => ({ ...prev, hasPermission: true, isLoading: false }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request location';
      setLocationState((prev) => ({ ...prev, isLoading: false, error: message }));
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
    setLocationState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Reverse geocode to get city
      try {
        const [place] = await Location.reverseGeocodeAsync(coordinates);
        const city = place.city ?? place.subregion ?? place.region ?? null;
        setLocationState((prev) => ({
          ...prev,
          coordinates,
          city,
          hasPermission: true,
          isLoading: false,
        }));
      } catch {
        setLocationState((prev) => ({
          ...prev,
          coordinates,
          hasPermission: true,
          isLoading: false,
        }));
      }

      return coordinates;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setLocationState((prev) => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setLocationState((prev) => ({ ...prev, hasPermission: true }));
      }
    });
  }, []);

  return {
    ...locationState,
    requestPermission,
    getCurrentLocation,
  };
}
