export interface SearchLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export function parseCoordinates(latitude: string, longitude: string) {
  const lat = Number(latitude),
    lng = Number(longitude);
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  const errors: { latitude?: string; longitude?: string } = {};
  if (
    !decimal.test(latitude.trim()) ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90
  )
    errors.latitude = "Vĩ độ cần là số từ -90 đến 90.";
  if (
    !decimal.test(longitude.trim()) ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  )
    errors.longitude = "Kinh độ cần là số từ -180 đến 180.";
  return {
    errors,
    point: Object.keys(errors).length
      ? null
      : { latitude: lat, longitude: lng },
  };
}
