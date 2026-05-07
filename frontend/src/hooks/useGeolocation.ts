import { useState } from "react";

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string>("");

  const requestLocation = async () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setLoading(false);
      setError("Geolocation is not supported in this browser");
      throw new Error("Geolocation is not supported in this browser");
    }

    return await new Promise<{ latitude: number; longitude: number }>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLocation(nextLocation);
            setLoading(false);
            resolve(nextLocation);
          },
          (geoError) => {
            const message = geoError.message || "Unable to access location";
            setLoading(false);
            setError(message);
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      },
    );
  };

  return { loading, location, error, requestLocation, setLocation };
}
