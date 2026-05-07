package services

import "math"

func distanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371000.0
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	value := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * earthRadius * math.Atan2(math.Sqrt(value), math.Sqrt(1-value))
}