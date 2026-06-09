export interface CityData {
  name: string;
  lat: number;
  lng: number;
  pm25: number;
  pm10: number;
  aqi: number;
  windDirection: number;
  windSpeed: number;
}

interface CityBase {
  name: string;
  lat: number;
  lng: number;
  basePm25: number;
  basePm10: number;
  baseAqi: number;
}

const CITIES: CityBase[] = [
  { name: '北京', lat: 39.9042, lng: 116.4074, basePm25: 65, basePm10: 95, baseAqi: 85 },
  { name: '上海', lat: 31.2304, lng: 121.4737, basePm25: 45, basePm10: 68, baseAqi: 62 },
  { name: '广州', lat: 23.1291, lng: 113.2644, basePm25: 38, basePm10: 55, baseAqi: 52 },
  { name: '深圳', lat: 22.5431, lng: 114.0579, basePm25: 32, basePm10: 48, baseAqi: 45 },
  { name: '成都', lat: 30.5728, lng: 104.0668, basePm25: 58, basePm10: 82, baseAqi: 76 },
  { name: '重庆', lat: 29.5630, lng: 106.5516, basePm25: 52, basePm10: 75, baseAqi: 68 },
  { name: '武汉', lat: 30.5928, lng: 114.3055, basePm25: 55, basePm10: 78, baseAqi: 72 },
  { name: '杭州', lat: 30.2741, lng: 120.1551, basePm25: 42, basePm10: 62, baseAqi: 58 },
  { name: '南京', lat: 32.0603, lng: 118.7969, basePm25: 48, basePm10: 70, baseAqi: 65 },
  { name: '西安', lat: 34.3416, lng: 108.9398, basePm25: 72, basePm10: 105, baseAqi: 95 },
  { name: '天津', lat: 39.3434, lng: 117.3616, basePm25: 62, basePm10: 90, baseAqi: 82 },
  { name: '苏州', lat: 31.2990, lng: 120.5853, basePm25: 44, basePm10: 65, baseAqi: 60 },
  { name: '郑州', lat: 34.7466, lng: 113.6254, basePm25: 78, basePm10: 115, baseAqi: 102 },
  { name: '长沙', lat: 28.2282, lng: 112.9388, basePm25: 50, basePm10: 72, baseAqi: 66 },
  { name: '青岛', lat: 36.0671, lng: 120.3826, basePm25: 35, basePm10: 52, baseAqi: 48 },
  { name: '沈阳', lat: 41.8057, lng: 123.4315, basePm25: 68, basePm10: 98, baseAqi: 90 },
  { name: '宁波', lat: 29.8683, lng: 121.5440, basePm25: 40, basePm10: 60, baseAqi: 55 },
  { name: '东莞', lat: 23.0208, lng: 113.7518, basePm25: 42, basePm10: 63, baseAqi: 57 },
  { name: '佛山', lat: 23.0218, lng: 113.1219, basePm25: 45, basePm10: 68, baseAqi: 62 },
  { name: '济南', lat: 36.6512, lng: 117.1201, basePm25: 65, basePm10: 95, baseAqi: 85 },
  { name: '合肥', lat: 31.8206, lng: 117.2272, basePm25: 52, basePm10: 76, baseAqi: 68 },
  { name: '福州', lat: 26.0745, lng: 119.2965, basePm25: 28, basePm10: 42, baseAqi: 38 },
  { name: '厦门', lat: 24.4798, lng: 118.0894, basePm25: 25, basePm10: 38, baseAqi: 35 },
  { name: '昆明', lat: 25.0389, lng: 102.7183, basePm25: 22, basePm10: 35, baseAqi: 30 },
  { name: '哈尔滨', lat: 45.8038, lng: 126.5350, basePm25: 75, basePm10: 110, baseAqi: 98 },
  { name: '长春', lat: 43.8171, lng: 125.3235, basePm25: 70, basePm10: 102, baseAqi: 92 },
  { name: '大连', lat: 38.9140, lng: 121.6147, basePm25: 42, basePm10: 62, baseAqi: 58 },
  { name: '太原', lat: 37.8706, lng: 112.5489, basePm25: 82, basePm10: 125, baseAqi: 110 },
  { name: '南昌', lat: 28.6820, lng: 115.8579, basePm25: 48, basePm10: 70, baseAqi: 64 },
  { name: '南宁', lat: 22.8170, lng: 108.3669, basePm25: 32, basePm10: 48, baseAqi: 44 },
  { name: '贵阳', lat: 26.6470, lng: 106.6302, basePm25: 30, basePm10: 45, baseAqi: 42 },
  { name: '兰州', lat: 36.0611, lng: 103.8343, basePm25: 88, basePm10: 135, baseAqi: 118 },
  { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168, basePm25: 95, basePm10: 145, baseAqi: 128 },
  { name: '呼和浩特', lat: 40.8426, lng: 111.7511, basePm25: 60, basePm10: 88, baseAqi: 78 },
  { name: '银川', lat: 38.4872, lng: 106.2309, basePm25: 55, basePm10: 80, baseAqi: 72 },
  { name: '西宁', lat: 36.6171, lng: 101.7782, basePm25: 58, basePm10: 85, baseAqi: 75 },
  { name: '拉萨', lat: 29.6520, lng: 91.1721, basePm25: 15, basePm10: 25, baseAqi: 20 },
  { name: '海口', lat: 20.0440, lng: 110.1920, basePm25: 18, basePm10: 28, baseAqi: 25 },
  { name: '三亚', lat: 18.2528, lng: 109.5119, basePm25: 15, basePm10: 22, baseAqi: 22 },
  { name: '石家庄', lat: 38.0428, lng: 114.5149, basePm25: 85, basePm10: 128, baseAqi: 112 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Osaka', lat: 34.6937, lng: 135.5023, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, basePm25: 45, basePm10: 65, baseAqi: 60 },
  { name: 'Busan', lat: 35.1796, lng: 129.0756, basePm25: 38, basePm10: 55, baseAqi: 52 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, basePm25: 42, basePm10: 58, baseAqi: 55 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, basePm25: 48, basePm10: 68, baseAqi: 62 },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, basePm25: 55, basePm10: 78, baseAqi: 72 },
  { name: 'Manila', lat: 14.5995, lng: 120.9842, basePm25: 38, basePm10: 55, baseAqi: 50 },
  { name: 'Hanoi', lat: 21.0278, lng: 105.8342, basePm25: 58, basePm10: 82, baseAqi: 75 },
  { name: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297, basePm25: 42, basePm10: 62, baseAqi: 55 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, basePm25: 95, basePm10: 145, baseAqi: 130 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, basePm25: 125, basePm10: 185, baseAqi: 170 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, basePm25: 88, basePm10: 132, baseAqi: 115 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946, basePm25: 52, basePm10: 78, baseAqi: 68 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, basePm25: 62, basePm10: 92, baseAqi: 80 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, basePm25: 110, basePm10: 165, baseAqi: 150 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587, basePm25: 135, basePm10: 198, baseAqi: 180 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, basePm25: 140, basePm10: 205, baseAqi: 185 },
  { name: 'Tehran', lat: 35.6892, lng: 51.3890, basePm25: 78, basePm10: 115, baseAqi: 102 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, basePm25: 65, basePm10: 95, baseAqi: 85 },
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753, basePm25: 88, basePm10: 132, baseAqi: 115 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, basePm25: 42, basePm10: 62, baseAqi: 55 },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Saint Petersburg', lat: 59.9311, lng: 30.3609, basePm25: 22, basePm10: 35, baseAqi: 30 },
  { name: 'London', lat: 51.5074, lng: -0.1278, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, basePm25: 25, basePm10: 42, baseAqi: 35 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, basePm25: 16, basePm10: 30, baseAqi: 22 },
  { name: 'Brussels', lat: 50.8503, lng: 4.3517, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Vienna', lat: 48.2082, lng: 16.3738, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Zurich', lat: 47.3769, lng: 8.5417, basePm25: 12, basePm10: 22, baseAqi: 18 },
  { name: 'Stockholm', lat: 59.3293, lng: 18.0686, basePm25: 10, basePm10: 18, baseAqi: 15 },
  { name: 'Oslo', lat: 59.9139, lng: 10.7522, basePm25: 12, basePm10: 22, baseAqi: 18 },
  { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, basePm25: 14, basePm10: 25, baseAqi: 20 },
  { name: 'Helsinki', lat: 60.1699, lng: 24.9384, basePm25: 10, basePm10: 18, baseAqi: 15 },
  { name: 'Warsaw', lat: 52.2297, lng: 21.0122, basePm25: 32, basePm10: 48, baseAqi: 42 },
  { name: 'Prague', lat: 50.0755, lng: 14.4378, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Budapest', lat: 47.4979, lng: 19.0402, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Athens', lat: 37.9838, lng: 23.7275, basePm25: 30, basePm10: 48, baseAqi: 40 },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Dublin', lat: 53.3498, lng: -6.2603, basePm25: 15, basePm10: 28, baseAqi: 22 },
  { name: 'New York', lat: 40.7128, lng: -74.0060, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, basePm25: 42, basePm10: 65, baseAqi: 58 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, basePm25: 25, basePm10: 42, baseAqi: 35 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, basePm25: 30, basePm10: 48, baseAqi: 40 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, basePm25: 26, basePm10: 42, baseAqi: 36 },
  { name: 'San Antonio', lat: 29.4241, lng: -98.4936, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'San Jose', lat: 37.3382, lng: -121.8863, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Austin', lat: 30.2672, lng: -97.7431, basePm25: 24, basePm10: 40, baseAqi: 32 },
  { name: 'Jacksonville', lat: 30.3322, lng: -81.6557, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Columbus', lat: 39.9612, lng: -82.9988, basePm25: 24, basePm10: 40, baseAqi: 32 },
  { name: 'Indianapolis', lat: 39.7684, lng: -86.1581, basePm25: 26, basePm10: 42, baseAqi: 35 },
  { name: 'Fort Worth', lat: 32.7555, lng: -97.3308, basePm25: 30, basePm10: 48, baseAqi: 40 },
  { name: 'Charlotte', lat: 35.2271, lng: -80.8431, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, basePm25: 15, basePm10: 28, baseAqi: 22 },
  { name: 'Denver', lat: 39.7392, lng: -104.9903, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'El Paso', lat: 31.7619, lng: -106.4850, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Washington', lat: 38.9072, lng: -77.0369, basePm25: 24, basePm10: 40, baseAqi: 32 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673, basePm25: 16, basePm10: 30, baseAqi: 22 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, basePm25: 12, basePm10: 22, baseAqi: 18 },
  { name: 'Calgary', lat: 51.0447, lng: -114.0719, basePm25: 15, basePm10: 28, baseAqi: 22 },
  { name: 'Ottawa', lat: 45.4215, lng: -75.6972, basePm25: 14, basePm10: 25, baseAqi: 20 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, basePm25: 72, basePm10: 108, baseAqi: 95 },
  { name: 'Guadalajara', lat: 20.6597, lng: -103.3496, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Santiago', lat: -33.4489, lng: -70.6693, basePm25: 42, basePm10: 65, baseAqi: 58 },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Bogotá', lat: 4.7110, lng: -74.0721, basePm25: 35, basePm10: 55, baseAqi: 48 },
  { name: 'Caracas', lat: 10.4806, lng: -66.9036, basePm25: 42, basePm10: 65, baseAqi: 58 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, basePm25: 95, basePm10: 145, baseAqi: 128 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, basePm25: 72, basePm10: 108, baseAqi: 95 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, basePm25: 42, basePm10: 65, baseAqi: 58 },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, basePm25: 35, basePm10: 55, baseAqi: 48 },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, basePm25: 45, basePm10: 68, baseAqi: 60 },
  { name: 'Addis Ababa', lat: 9.0300, lng: 38.7400, basePm25: 55, basePm10: 82, baseAqi: 72 },
  { name: 'Accra', lat: 5.6037, lng: -0.1870, basePm25: 42, basePm10: 65, baseAqi: 58 },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Luanda', lat: -8.8390, lng: 13.2894, basePm25: 52, basePm10: 78, baseAqi: 68 },
  { name: 'Kinshasa', lat: -4.4419, lng: 15.2663, basePm25: 62, basePm10: 92, baseAqi: 82 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, basePm25: 15, basePm10: 28, baseAqi: 22 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251, basePm25: 16, basePm10: 30, baseAqi: 22 },
  { name: 'Perth', lat: -31.9505, lng: 115.8605, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, basePm25: 12, basePm10: 22, baseAqi: 18 },
  { name: 'Wellington', lat: -41.2866, lng: 174.7756, basePm25: 10, basePm10: 18, baseAqi: 15 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, basePm25: 35, basePm10: 52, baseAqi: 48 },
  { name: 'Taipei', lat: 25.0330, lng: 121.5654, basePm25: 30, basePm10: 45, baseAqi: 42 },
  { name: 'Macau', lat: 22.1987, lng: 113.5439, basePm25: 32, basePm10: 48, baseAqi: 45 },
  { name: 'Pyongyang', lat: 39.0392, lng: 125.7625, basePm25: 55, basePm10: 82, baseAqi: 72 },
  { name: 'Ulaanbaatar', lat: 47.8864, lng: 106.9057, basePm25: 68, basePm10: 98, baseAqi: 90 },
  { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, basePm25: 82, basePm10: 125, baseAqi: 108 },
  { name: 'Colombo', lat: 6.9271, lng: 79.8612, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Yangon', lat: 16.8409, lng: 96.1735, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Vientiane', lat: 17.9757, lng: 102.6331, basePm25: 42, basePm10: 62, baseAqi: 55 },
  { name: 'Phnom Penh', lat: 11.5564, lng: 104.9282, basePm25: 45, basePm10: 68, baseAqi: 60 },
  { name: 'Dili', lat: -8.5569, lng: 125.5603, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Reykjavik', lat: 64.1466, lng: -21.9426, basePm25: 8, basePm10: 15, baseAqi: 12 },
  { name: 'Luxembourg', lat: 49.6116, lng: 6.1319, basePm25: 14, basePm10: 25, baseAqi: 20 },
  { name: 'Valletta', lat: 35.8989, lng: 14.5146, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Monaco', lat: 43.7384, lng: 7.4246, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Skopje', lat: 41.9981, lng: 21.4254, basePm25: 45, basePm10: 68, baseAqi: 60 },
  { name: 'Tirana', lat: 41.3275, lng: 19.8187, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Sarajevo', lat: 43.8563, lng: 18.4131, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Belgrade', lat: 44.7866, lng: 20.4489, basePm25: 35, basePm10: 55, baseAqi: 48 },
  { name: 'Ljubljana', lat: 46.0569, lng: 14.5058, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Zagreb', lat: 45.8150, lng: 15.9819, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Bratislava', lat: 48.1486, lng: 17.1077, basePm25: 25, basePm10: 42, baseAqi: 35 },
  { name: 'Riga', lat: 56.9496, lng: 24.1052, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Tallinn', lat: 59.4370, lng: 24.7535, basePm25: 15, basePm10: 28, baseAqi: 22 },
  { name: 'Vilnius', lat: 54.6872, lng: 25.2797, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Minsk', lat: 53.9045, lng: 27.5615, basePm25: 30, basePm10: 48, baseAqi: 40 },
  { name: 'Kyiv', lat: 50.4501, lng: 30.5234, basePm25: 35, basePm10: 55, baseAqi: 48 },
  { name: 'Tbilisi', lat: 41.7151, lng: 44.8271, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Yerevan', lat: 40.1792, lng: 44.4991, basePm25: 45, basePm10: 68, baseAqi: 60 },
  { name: 'Baku', lat: 40.4093, lng: 49.8671, basePm25: 42, basePm10: 65, baseAqi: 55 },
  { name: 'Ashgabat', lat: 37.9601, lng: 58.3261, basePm25: 55, basePm10: 82, baseAqi: 72 },
  { name: 'Dushanbe', lat: 38.5598, lng: 68.7872, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Tashkent', lat: 41.2995, lng: 69.2401, basePm25: 52, basePm10: 78, baseAqi: 68 },
  { name: 'Astana', lat: 51.1694, lng: 71.4491, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Baghdad', lat: 33.3152, lng: 44.3661, basePm25: 88, basePm10: 132, baseAqi: 115 },
  { name: 'Damascus', lat: 33.5138, lng: 36.2765, basePm25: 78, basePm10: 118, baseAqi: 102 },
  { name: 'Beirut', lat: 33.8938, lng: 35.5018, basePm25: 52, basePm10: 78, baseAqi: 68 },
  { name: 'Amman', lat: 31.9539, lng: 35.9106, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Kuwait City', lat: 29.3759, lng: 47.9774, basePm25: 85, basePm10: 128, baseAqi: 112 },
  { name: 'Doha', lat: 25.2854, lng: 51.5310, basePm25: 72, basePm10: 108, baseAqi: 95 },
  { name: 'Muscat', lat: 23.5859, lng: 58.4059, basePm25: 55, basePm10: 82, baseAqi: 72 },
  { name: 'Tripoli', lat: 32.8872, lng: 13.1913, basePm25: 62, basePm10: 92, baseAqi: 82 },
  { name: 'Tunis', lat: 36.8065, lng: 10.1815, basePm25: 45, basePm10: 68, baseAqi: 60 },
  { name: 'Algiers', lat: 36.7538, lng: 3.0588, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Rabat', lat: 33.9716, lng: -6.8498, basePm25: 35, basePm10: 55, baseAqi: 48 },
  { name: 'Dakar', lat: 14.7167, lng: -17.4677, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Bamako', lat: 12.6392, lng: -8.0029, basePm25: 48, basePm10: 72, baseAqi: 62 },
  { name: 'Niamey', lat: 13.5116, lng: 2.1254, basePm25: 55, basePm10: 82, baseAqi: 72 },
  { name: 'Khartoum', lat: 15.5007, lng: 32.5599, basePm25: 72, basePm10: 108, baseAqi: 95 },
  { name: 'Maputo', lat: -25.9692, lng: 32.5732, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Pretoria', lat: -25.7479, lng: 28.2293, basePm25: 40, basePm10: 62, baseAqi: 55 },
  { name: 'Windhoek', lat: -22.5609, lng: 17.0658, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Gaborone', lat: -24.6282, lng: 25.9231, basePm25: 30, basePm10: 48, baseAqi: 42 },
  { name: 'Port Louis', lat: -20.1609, lng: 57.5012, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'Brasília', lat: -15.8267, lng: -47.9218, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Recife', lat: -8.0476, lng: -34.8770, basePm25: 28, basePm10: 45, baseAqi: 38 },
  { name: 'Salvador', lat: -12.9714, lng: -38.5014, basePm25: 30, basePm10: 48, baseAqi: 40 },
  { name: 'Fortaleza', lat: -3.7319, lng: -38.5267, basePm25: 25, basePm10: 40, baseAqi: 35 },
  { name: 'Curitiba', lat: -25.4284, lng: -49.2733, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177, basePm25: 20, basePm10: 35, baseAqi: 28 },
  { name: 'Manaus', lat: -3.1190, lng: -60.0217, basePm25: 18, basePm10: 32, baseAqi: 25 },
  { name: 'La Paz', lat: -16.4897, lng: -68.1193, basePm25: 38, basePm10: 58, baseAqi: 50 },
  { name: 'Asunción', lat: -25.2637, lng: -57.5759, basePm25: 32, basePm10: 50, baseAqi: 42 },
  { name: 'Montevideo', lat: -34.9011, lng: -56.1645, basePm25: 22, basePm10: 38, baseAqi: 30 },
  { name: 'Kabul', lat: 34.5553, lng: 69.2075, basePm25: 82, basePm10: 125, baseAqi: 108 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479, basePm25: 78, basePm10: 118, baseAqi: 102 }
];

const TOTAL_HOURS = 24;

export class DataManager {
  private hourlyData: CityData[][];

  constructor() {
    this.hourlyData = this.generateHourlyData();
  }

  private generateHourlyData(): CityData[][] {
    const data: CityData[][] = [];
    const uniqueCities = this.getUniqueCities();

    for (let hour = 0; hour <= TOTAL_HOURS; hour++) {
      const cities: CityData[] = uniqueCities.map((city) => {
        const timeFactor = Math.sin((hour / TOTAL_HOURS) * Math.PI * 2 + city.baseAqi * 0.01) * 0.3 + 1;
        const randomFactor = 0.85 + Math.random() * 0.3;
        const combinedFactor = timeFactor * randomFactor;

        return {
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          pm25: Math.max(5, Math.round(city.basePm25 * combinedFactor)),
          pm10: Math.max(8, Math.round(city.basePm10 * combinedFactor)),
          aqi: Math.max(10, Math.round(city.baseAqi * combinedFactor)),
          windDirection: Math.round(Math.random() * 360),
          windSpeed: Math.round((1 + Math.random() * 10) * 10) / 10
        };
      });
      data.push(cities);
    }

    return data;
  }

  private getUniqueCities(): CityBase[] {
    const seen = new Set<string>();
    return CITIES.filter((city) => {
      const key = `${city.name}_${city.lat}_${city.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 200);
  }

  getDataAtTime(timeIndex: number): CityData[] {
    const clampedIndex = Math.max(0, Math.min(1, timeIndex));
    const exactHour = clampedIndex * TOTAL_HOURS;
    const hour1 = Math.floor(exactHour);
    const hour2 = Math.min(TOTAL_HOURS, hour1 + 1);
    const t = exactHour - hour1;

    const data1 = this.hourlyData[hour1];
    const data2 = this.hourlyData[hour2];

    return data1.map((city1, i) => {
      const city2 = data2[i];
      return {
        name: city1.name,
        lat: city1.lat,
        lng: city1.lng,
        pm25: Math.round(this.lerp(city1.pm25, city2.pm25, t)),
        pm10: Math.round(this.lerp(city1.pm10, city2.pm10, t)),
        aqi: Math.round(this.lerp(city1.aqi, city2.aqi, t)),
        windDirection: Math.round(this.lerpAngle(city1.windDirection, city2.windDirection, t)),
        windSpeed: Math.round(this.lerp(city1.windSpeed, city2.windSpeed, t) * 10) / 10
      };
    });
  }

  getCity24HourData(cityName: string): CityData[] {
    return this.hourlyData.map((hourData) =>
      hourData.find((c) => c.name === cityName)
    ).filter((c): c is CityData => c !== undefined);
  }

  getCityCount(): number {
    return this.hourlyData[0].length;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return (a + diff * t + 360) % 360;
  }

  getFormattedUpdateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  getFormattedHourLabel(timeIndex: number): string {
    const clampedIndex = Math.max(0, Math.min(1, timeIndex));
    const hoursAgo = Math.round((1 - clampedIndex) * TOTAL_HOURS);
    const now = new Date();
    now.setHours(now.getHours() - hoursAgo);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

export type PollutantType = 'PM2.5' | 'PM10' | 'AQI';

export function getPollutantValue(city: CityData, type: PollutantType): number {
  switch (type) {
    case 'PM2.5':
      return city.pm25;
    case 'PM10':
      return city.pm10;
    case 'AQI':
      return city.aqi;
  }
}

export function getPollutantRange(type: PollutantType): { min: number; max: number } {
  switch (type) {
    case 'PM2.5':
      return { min: 0, max: 150 };
    case 'PM10':
      return { min: 0, max: 220 };
    case 'AQI':
      return { min: 0, max: 200 };
  }
}
