export interface StarData {
  id: string;
  name: string;
  constellation: string;
  x: number;
  y: number;
  z: number;
  magnitude: number;
  spectrum: string;
  color: string;
  distance: number;
}

export interface ConstellationData {
  id: string;
  name: string;
  nameCn: string;
  lines: number[][];
  story: string;
  starIds: string[];
}

const starDefs: { [key: string]: { name: string; ra: number; dec: number; distance: number; magnitude: number; spectrum: string } } = {};

function addStars(prefix: string, stars: { name: string; ra: number; dec: number; distance: number; magnitude: number; spectrum: string }[]) {
  stars.forEach((s, i) => {
    starDefs[`${prefix}-${i + 1}`] = s;
  });
}

addStars('orion', [
  { name: '参宿四 Betelgeuse', ra: 88.79, dec: 7.41, distance: 640, magnitude: 0.5, spectrum: 'M2I' },
  { name: '参宿五 Bellatrix', ra: 81.28, dec: 6.35, distance: 243, magnitude: 1.6, spectrum: 'B2III' },
  { name: '参宿三 Mintaka', ra: 83.0, dec: -0.3, distance: 1200, magnitude: 2.2, spectrum: 'O9.5II' },
  { name: '参宿一 Alnitak', ra: 85.19, dec: -1.94, distance: 1260, magnitude: 1.8, spectrum: 'O9.5Ib' },
  { name: '参宿二 Alnilam', ra: 86.26, dec: -1.2, distance: 1340, magnitude: 1.7, spectrum: 'B0Ia' },
  { name: '参宿七 Rigel', ra: 78.63, dec: -8.2, distance: 860, magnitude: 0.1, spectrum: 'B8Ia' },
  { name: '参宿六 Saiph', ra: 82.95, dec: -9.68, distance: 650, magnitude: 2.1, spectrum: 'B0.5Ia' },
  { name: '参宿九', ra: 80.5, dec: 2.0, distance: 900, magnitude: 3.3, spectrum: 'B1V' }
]);

addStars('uma', [
  { name: '天枢 Dubhe', ra: 165.46, dec: 61.75, distance: 123, magnitude: 1.8, spectrum: 'K0III' },
  { name: '天璇 Merak', ra: 162.63, dec: 56.38, distance: 79.7, magnitude: 2.4, spectrum: 'A1V' },
  { name: '天玑 Phecda', ra: 163.7, dec: 53.67, distance: 83.2, magnitude: 2.5, spectrum: 'A0V' },
  { name: '天权 Megrez', ra: 167.06, dec: 57.03, distance: 80.5, magnitude: 3.3, spectrum: 'A3V' },
  { name: '玉衡 Alioth', ra: 168.66, dec: 55.96, distance: 81, magnitude: 1.8, spectrum: 'A0p' },
  { name: '开阳 Mizar', ra: 172.25, dec: 54.93, distance: 78.2, magnitude: 2.1, spectrum: 'A2V' },
  { name: '摇光 Alkaid', ra: 177.42, dec: 49.31, distance: 104, magnitude: 1.9, spectrum: 'B3V' },
  { name: '天牢三', ra: 160.0, dec: 42.0, distance: 300, magnitude: 3.8, spectrum: 'A2V' }
]);

addStars('umi', [
  { name: '勾陈一 Polaris', ra: 37.95, dec: 89.26, distance: 433, magnitude: 2.0, spectrum: 'F7Ib-II' },
  { name: '勾陈二', ra: 37.5, dec: 86.0, distance: 200, magnitude: 4.3, spectrum: 'A3V' },
  { name: '勾陈三', ra: 48.0, dec: 86.0, distance: 350, magnitude: 5.0, spectrum: 'F5V' },
  { name: '天枢 (小熊座)', ra: 55.0, dec: 83.0, distance: 400, magnitude: 4.5, spectrum: 'K0III' },
  { name: '天璇 (小熊座)', ra: 60.0, dec: 80.0, distance: 450, magnitude: 4.2, spectrum: 'A5V' },
  { name: '天权 (小熊座)', ra: 70.0, dec: 77.0, distance: 380, magnitude: 5.1, spectrum: 'F2V' },
  { name: '开阳 (小熊座)', ra: 80.0, dec: 72.0, distance: 420, magnitude: 4.8, spectrum: 'G5V' }
]);

addStars('cas', [
  { name: '王良四', ra: 350.5, dec: 60.7, distance: 420, magnitude: 2.47, spectrum: 'B0.5III' },
  { name: '王良一', ra: 358.1, dec: 59.15, distance: 60, magnitude: 2.28, spectrum: 'F2IV-V' },
  { name: '策', ra: 0.67, dec: 60.7, distance: 550, magnitude: 2.24, spectrum: 'B8III' },
  { name: '王良三', ra: 5.68, dec: 58.3, distance: 430, magnitude: 2.68, spectrum: 'B9III' },
  { name: '王良二', ra: 9.19, dec: 57.8, distance: 220, magnitude: 3.37, spectrum: 'A5V' }
]);

addStars('leo', [
  { name: '轩辕十四 Regulus', ra: 152.09, dec: 11.97, distance: 79, magnitude: 1.4, spectrum: 'B7V' },
  { name: '五帝座一 Denebola', ra: 180.12, dec: 14.57, distance: 36, magnitude: 2.1, spectrum: 'A3V' },
  { name: '轩辕十二 Algieba', ra: 157.97, dec: 19.84, distance: 126, magnitude: 2.0, spectrum: 'K0III' },
  { name: '轩辕九', ra: 155.5, dec: 23.5, distance: 200, magnitude: 2.98, spectrum: 'G9II' },
  { name: '轩辕十三', ra: 150.2, dec: 20.5, distance: 150, magnitude: 3.52, spectrum: 'A2V' },
  { name: '西上相', ra: 146.7, dec: 9.8, distance: 320, magnitude: 4.0, spectrum: 'A5V' },
  { name: '太微右垣五', ra: 145.0, dec: 6.0, distance: 280, magnitude: 3.8, spectrum: 'K2III' },
  { name: '轩辕十', ra: 163.0, dec: 15.0, distance: 180, magnitude: 3.3, spectrum: 'F0V' },
  { name: '九子', ra: 170.0, dec: 19.0, distance: 260, magnitude: 4.1, spectrum: 'G0V' }
]);

addStars('sco', [
  { name: '心宿二 Antares', ra: 247.35, dec: -26.43, distance: 550, magnitude: 1.0, spectrum: 'M1.5Iab' },
  { name: '尾宿九 Shaula', ra: 259.29, dec: -37.1, distance: 570, magnitude: 1.6, spectrum: 'B1.5IV' },
  { name: '尾宿八 Lesath', ra: 258.86, dec: -38.07, distance: 900, magnitude: 2.7, spectrum: 'B2IV' },
  { name: '房宿四 Graffias', ra: 242.56, dec: -19.8, distance: 530, magnitude: 2.6, spectrum: 'B1V' },
  { name: '房宿三 Dschubba', ra: 244.13, dec: -22.63, distance: 400, magnitude: 2.3, spectrum: 'B0V' },
  { name: '心宿三', ra: 250.0, dec: -30.0, distance: 480, magnitude: 2.9, spectrum: 'B2V' },
  { name: '心宿一', ra: 248.0, dec: -25.0, distance: 1000, magnitude: 3.0, spectrum: 'B1V' },
  { name: '尾宿一', ra: 253.0, dec: -33.0, distance: 350, magnitude: 3.3, spectrum: 'B3V' },
  { name: '尾宿二', ra: 254.5, dec: -34.5, distance: 420, magnitude: 2.8, spectrum: 'B2V' },
  { name: '尾宿七', ra: 257.0, dec: -36.0, distance: 380, magnitude: 2.7, spectrum: 'B3V' },
  { name: '尾宿五', ra: 256.0, dec: -35.5, distance: 300, magnitude: 2.3, spectrum: 'B2V' }
]);

addStars('tau', [
  { name: '毕宿五 Aldebaran', ra: 68.98, dec: 16.51, distance: 65, magnitude: 0.85, spectrum: 'K5III' },
  { name: '五车五 Elnath', ra: 81.13, dec: 28.6, distance: 131, magnitude: 1.65, spectrum: 'B7III' },
  { name: '天关 Zeta Tauri', ra: 83.88, dec: 21.95, distance: 410, magnitude: 2.97, spectrum: 'B2IIIp' },
  { name: '天困一', ra: 75.0, dec: 25.5, distance: 100, magnitude: 3.6, spectrum: 'A5V' },
  { name: '毕宿一', ra: 70.0, dec: 12.5, distance: 150, magnitude: 3.8, spectrum: 'G8III' },
  { name: '昴宿六 Alcyone', ra: 55.93, dec: 24.11, distance: 370, magnitude: 2.87, spectrum: 'B7III' },
  { name: '昴宿七 Atlas', ra: 54.7, dec: 23.8, distance: 380, magnitude: 3.62, spectrum: 'B8III' }
]);

addStars('gem', [
  { name: '北河三 Pollux', ra: 116.33, dec: 28.03, distance: 34, magnitude: 1.14, spectrum: 'K0III' },
  { name: '北河二 Castor', ra: 113.65, dec: 31.89, distance: 51, magnitude: 1.58, spectrum: 'A1V' },
  { name: '井宿三', ra: 108.3, dec: 22.0, distance: 160, magnitude: 3.3, spectrum: 'A3V' },
  { name: '井宿四', ra: 110.0, dec: 20.0, distance: 180, magnitude: 3.5, spectrum: 'F0V' },
  { name: '天樽二', ra: 115.0, dec: 25.0, distance: 120, magnitude: 3.8, spectrum: 'G8III' },
  { name: '天樽三', ra: 118.0, dec: 26.0, distance: 140, magnitude: 3.7, spectrum: 'K0III' },
  { name: '五诸侯三', ra: 105.0, dec: 18.0, distance: 200, magnitude: 4.1, spectrum: 'A2V' },
  { name: '五诸侯五', ra: 102.0, dec: 16.0, distance: 250, magnitude: 4.3, spectrum: 'B9V' }
]);

addStars('and', [
  { name: '壁宿二 Alpheratz', ra: 2.11, dec: 29.09, distance: 97, magnitude: 2.06, spectrum: 'B9p' },
  { name: '奎宿九 Mirach', ra: 17.43, dec: 35.62, distance: 200, magnitude: 2.07, spectrum: 'M0III' },
  { name: '天大将军一 Almach', ra: 26.27, dec: 42.33, distance: 350, magnitude: 2.1, spectrum: 'K3IIb' },
  { name: '奎宿二', ra: 12.5, dec: 32.0, distance: 280, magnitude: 4.3, spectrum: 'A3V' },
  { name: '奎宿七', ra: 22.0, dec: 38.0, distance: 320, magnitude: 4.0, spectrum: 'K5III' },
  { name: '阁道三', ra: 30.0, dec: 45.0, distance: 400, magnitude: 3.8, spectrum: 'B8V' }
]);

addStars('per', [
  { name: '天船三 Mirfak', ra: 50.21, dec: 49.86, distance: 506, magnitude: 1.79, spectrum: 'F5Ib' },
  { name: '大陵五 Algol', ra: 47.04, dec: 40.96, distance: 93, magnitude: 2.12, spectrum: 'B8V' },
  { name: '天船二', ra: 44.0, dec: 47.5, distance: 1600, magnitude: 3.0, spectrum: 'B1I' },
  { name: '天船五', ra: 52.0, dec: 47.0, distance: 520, magnitude: 3.8, spectrum: 'B5V' },
  { name: '天船六', ra: 54.0, dec: 46.0, distance: 600, magnitude: 4.0, spectrum: 'A0V' },
  { name: '卷舌四', ra: 40.0, dec: 44.0, distance: 300, magnitude: 3.5, spectrum: 'K2III' },
  { name: '卷舌二', ra: 38.0, dec: 39.0, distance: 400, magnitude: 3.9, spectrum: 'A2V' },
  { name: '天英一', ra: 45.0, dec: 34.0, distance: 350, magnitude: 4.2, spectrum: 'F0V' }
]);

addStars('cyg', [
  { name: '天津四 Deneb', ra: 294.73, dec: 45.28, distance: 2600, magnitude: 1.25, spectrum: 'A2Ia' },
  { name: '天津一', ra: 292.0, dec: 27.0, distance: 1500, magnitude: 3.2, spectrum: 'A0Ib' },
  { name: '天津二', ra: 296.5, dec: 30.5, distance: 1400, magnitude: 2.9, spectrum: 'B9I' },
  { name: '天津九', ra: 298.0, dec: 33.0, distance: 2000, magnitude: 2.5, spectrum: 'B8I' },
  { name: '辇道增七 Albireo', ra: 292.2, dec: 27.96, distance: 430, magnitude: 3.1, spectrum: 'K2II+B9V' },
  { name: '天津八', ra: 300.0, dec: 37.0, distance: 1800, magnitude: 2.7, spectrum: 'A0I' }
]);

addStars('lyr', [
  { name: '织女一 Vega', ra: 279.23, dec: 38.78, distance: 25, magnitude: 0.03, spectrum: 'A0V' },
  { name: '渐台二', ra: 281.5, dec: 33.0, distance: 220, magnitude: 3.5, spectrum: 'B9p' },
  { name: '渐台三', ra: 283.0, dec: 32.5, distance: 460, magnitude: 4.0, spectrum: 'B3V' },
  { name: '渐台四', ra: 284.5, dec: 33.5, distance: 300, magnitude: 4.2, spectrum: 'A3V' },
  { name: '渐台一', ra: 280.0, dec: 34.5, distance: 500, magnitude: 4.3, spectrum: 'B2.5V' }
]);

addStars('aql', [
  { name: '河鼓二 Altair', ra: 297.7, dec: 8.87, distance: 16.7, magnitude: 0.77, spectrum: 'A7V' },
  { name: '河鼓一', ra: 294.5, dec: 13.5, distance: 50, magnitude: 3.4, spectrum: 'A3V' },
  { name: '河鼓三', ra: 300.5, dec: 10.5, distance: 340, magnitude: 2.7, spectrum: 'B9V' },
  { name: '天桴四', ra: 293.0, dec: 7.5, distance: 280, magnitude: 3.7, spectrum: 'B9V' },
  { name: '天桴一', ra: 296.0, dec: 5.0, distance: 200, magnitude: 4.0, spectrum: 'A2V' },
  { name: '右旗一', ra: 303.0, dec: 8.0, distance: 320, magnitude: 3.8, spectrum: 'B8V' }
]);

addStars('vir', [
  { name: '角宿一 Spica', ra: 201.29, dec: -11.16, distance: 250, magnitude: 0.97, spectrum: 'B1V' },
  { name: '东上相 Vindemiatrix', ra: 188.76, dec: 10.0, distance: 102, magnitude: 2.83, spectrum: 'G8III' },
  { name: '角宿二', ra: 195.0, dec: -8.0, distance: 80, magnitude: 3.4, spectrum: 'A3V' },
  { name: '亢宿一', ra: 190.0, dec: -3.5, distance: 65, magnitude: 4.1, spectrum: 'K0III' },
  { name: '亢宿二', ra: 186.0, dec: 1.0, distance: 280, magnitude: 3.5, spectrum: 'B8V' },
  { name: '氐宿一', ra: 182.0, dec: 5.0, distance: 200, magnitude: 3.9, spectrum: 'A0V' },
  { name: '天门一', ra: 180.0, dec: 14.0, distance: 150, magnitude: 3.7, spectrum: 'G2III' },
  { name: '内平一', ra: 175.0, dec: 18.0, distance: 180, magnitude: 4.0, spectrum: 'F0V' }
]);

addStars('sgr', [
  { name: '箕宿三 Kaus Australis', ra: 280.5, dec: -34.38, distance: 143, magnitude: 1.85, spectrum: 'B9.5III' },
  { name: '箕宿二', ra: 276.5, dec: -30.0, distance: 120, magnitude: 3.1, spectrum: 'K0III' },
  { name: '箕宿一', ra: 273.0, dec: -25.5, distance: 150, magnitude: 3.3, spectrum: 'A3V' },
  { name: '斗宿四 Nunki', ra: 284.85, dec: -26.3, distance: 228, magnitude: 2.06, spectrum: 'B2.5V' },
  { name: '斗宿三', ra: 282.0, dec: -24.0, distance: 180, magnitude: 2.7, spectrum: 'B8V' },
  { name: '斗宿六', ra: 287.0, dec: -27.0, distance: 120, magnitude: 2.9, spectrum: 'A0V' },
  { name: '建一', ra: 278.0, dec: -20.0, distance: 140, magnitude: 3.5, spectrum: 'K2III' },
  { name: '建二', ra: 280.0, dec: -18.0, distance: 200, magnitude: 4.0, spectrum: 'A5V' },
  { name: '建三', ra: 282.5, dec: -17.5, distance: 250, magnitude: 3.8, spectrum: 'B9V' },
  { name: '天渊三', ra: 285.0, dec: -21.0, distance: 300, magnitude: 3.2, spectrum: 'B5V' }
]);

addStars('cap', [
  { name: '垒壁阵四', ra: 307.4, dec: -12.9, distance: 39, magnitude: 3.0, spectrum: 'A7III' },
  { name: '牛宿一', ra: 315.0, dec: -14.5, distance: 300, magnitude: 3.8, spectrum: 'B8V' },
  { name: '牛宿二', ra: 312.0, dec: -15.5, distance: 160, magnitude: 4.0, spectrum: 'G8III' },
  { name: '牛宿六', ra: 318.0, dec: -13.5, distance: 400, magnitude: 3.9, spectrum: 'A0V' },
  { name: '女宿一', ra: 320.0, dec: -10.5, distance: 200, magnitude: 4.1, spectrum: 'K0III' },
  { name: '女宿二', ra: 322.0, dec: -7.5, distance: 250, magnitude: 3.8, spectrum: 'A3V' },
  { name: '女宿三', ra: 325.0, dec: -5.0, distance: 300, magnitude: 4.3, spectrum: 'F2V' },
  { name: '虚宿一', ra: 310.0, dec: -6.0, distance: 180, magnitude: 3.7, spectrum: 'G5III' },
  { name: '虚宿二', ra: 305.0, dec: -9.0, distance: 200, magnitude: 4.0, spectrum: 'A2V' }
]);

addStars('aqr', [
  { name: '危宿一', ra: 334.5, dec: 0.0, distance: 138, magnitude: 2.9, spectrum: 'G2Ib' },
  { name: '危宿二', ra: 333.0, dec: -5.0, distance: 300, magnitude: 3.8, spectrum: 'B9V' },
  { name: '危宿三', ra: 337.0, dec: -2.5, distance: 200, magnitude: 3.7, spectrum: 'A5V' },
  { name: '坟墓一', ra: 331.0, dec: -7.0, distance: 250, magnitude: 4.1, spectrum: 'K2III' },
  { name: '坟墓二', ra: 335.0, dec: -8.0, distance: 400, magnitude: 3.9, spectrum: 'A0V' },
  { name: '哭一', ra: 330.0, dec: -10.0, distance: 220, magnitude: 3.6, spectrum: 'B8V' },
  { name: '泣二', ra: 338.0, dec: -5.0, distance: 180, magnitude: 3.8, spectrum: 'F0V' },
  { name: '羽林军二十六', ra: 345.0, dec: -6.0, distance: 300, magnitude: 4.0, spectrum: 'G0V' },
  { name: '北落师门', ra: 340.0, dec: -2.0, distance: 500, magnitude: 3.5, spectrum: 'B7V' }
]);

addStars('psc', [
  { name: '外屏七', ra: 2.0, dec: 7.5, distance: 300, magnitude: 4.3, spectrum: 'A3V' },
  { name: '外屏三', ra: 3.5, dec: 8.0, distance: 250, magnitude: 4.0, spectrum: 'K0III' },
  { name: '外屏一', ra: 5.0, dec: 9.0, distance: 200, magnitude: 4.2, spectrum: 'F0V' },
  { name: '奎宿十四', ra: 8.0, dec: 10.0, distance: 280, magnitude: 3.9, spectrum: 'A5V' },
  { name: '奎宿十六', ra: 10.0, dec: 11.0, distance: 350, magnitude: 4.1, spectrum: 'B9V' },
  { name: '霹雳五', ra: 13.0, dec: 9.0, distance: 400, magnitude: 4.0, spectrum: 'G5V' },
  { name: '娄宿增十二', ra: 15.0, dec: 6.0, distance: 200, magnitude: 3.8, spectrum: 'A2V' },
  { name: '右更二', ra: 18.0, dec: 3.5, distance: 180, magnitude: 4.0, spectrum: 'G2III' },
  { name: '右更一', ra: 20.0, dec: 2.0, distance: 220, magnitude: 4.2, spectrum: 'K0III' },
  { name: '右更四', ra: 23.0, dec: 1.0, distance: 300, magnitude: 4.3, spectrum: 'F5V' }
]);

addStars('ari', [
  { name: '娄宿三 Hamal', ra: 31.79, dec: 23.46, distance: 66, magnitude: 2.0, spectrum: 'K2III' },
  { name: '娄宿一 Sheratan', ra: 29.67, dec: 20.78, distance: 59, magnitude: 2.65, spectrum: 'A5V' },
  { name: '娄宿二 Mesarthim', ra: 30.72, dec: 19.5, distance: 180, magnitude: 3.9, spectrum: 'B9V' },
  { name: '左更一', ra: 33.0, dec: 20.0, distance: 200, magnitude: 4.0, spectrum: 'K0III' },
  { name: '左更二', ra: 34.5, dec: 22.0, distance: 180, magnitude: 3.8, spectrum: 'G8III' },
  { name: '五诸侯一', ra: 27.0, dec: 18.5, distance: 250, magnitude: 4.2, spectrum: 'A3V' },
  { name: '天阴一', ra: 28.0, dec: 24.5, distance: 300, magnitude: 4.1, spectrum: 'F0V' }
]);

addStars('cnc', [
  { name: '柳宿增三', ra: 132.0, dec: 18.0, distance: 200, magnitude: 4.0, spectrum: 'A5V' },
  { name: '鬼宿三', ra: 126.0, dec: 19.5, distance: 300, magnitude: 3.9, spectrum: 'K5III' },
  { name: '鬼宿四', ra: 128.0, dec: 17.5, distance: 250, magnitude: 4.2, spectrum: 'G8V' },
  { name: '积尸气', ra: 129.0, dec: 20.1, distance: 577, magnitude: 3.4, spectrum: 'B3V' },
  { name: '井宿一', ra: 120.0, dec: 23.0, distance: 180, magnitude: 3.8, spectrum: 'F0V' },
  { name: '水位一', ra: 135.0, dec: 15.0, distance: 220, magnitude: 4.3, spectrum: 'A2V' }
]);

addStars('lib', [
  { name: '氐宿一 Zubenelgenubi', ra: 227.7, dec: -16.0, distance: 75.8, magnitude: 2.75, spectrum: 'A3IV' },
  { name: '氐宿四 Zubeneschamali', ra: 224.9, dec: -9.38, distance: 185, magnitude: 2.6, spectrum: 'B8V' },
  { name: '氐宿三', ra: 225.5, dec: -14.0, distance: 300, magnitude: 3.5, spectrum: 'B5V' },
  { name: '亢宿三', ra: 218.0, dec: -11.0, distance: 400, magnitude: 3.9, spectrum: 'A0V' },
  { name: '亢宿四', ra: 220.0, dec: -16.5, distance: 250, magnitude: 4.1, spectrum: 'K0III' },
  { name: '折威七', ra: 230.0, dec: -20.0, distance: 350, magnitude: 3.7, spectrum: 'G8III' }
]);

addStars('boo', [
  { name: '大角星 Arcturus', ra: 213.91, dec: 19.18, distance: 36.7, magnitude: -0.05, spectrum: 'K1.5III' },
  { name: '梗河一', ra: 207.0, dec: 27.0, distance: 80, magnitude: 2.6, spectrum: 'A0V' },
  { name: '梗河三', ra: 210.0, dec: 28.5, distance: 150, magnitude: 3.5, spectrum: 'K5III' },
  { name: '招摇', ra: 203.0, dec: 38.0, distance: 100, magnitude: 3.0, spectrum: 'K0III' },
  { name: '玄戈', ra: 200.0, dec: 46.0, distance: 120, magnitude: 3.5, spectrum: 'A5V' },
  { name: '天枪一', ra: 215.0, dec: 48.0, distance: 160, magnitude: 4.0, spectrum: 'G8V' },
  { name: '天枪三', ra: 220.0, dec: 43.0, distance: 140, magnitude: 3.9, spectrum: 'A2V' },
  { name: '七公七', ra: 230.0, dec: 35.0, distance: 200, magnitude: 3.6, spectrum: 'G0V' }
]);

addStars('her', [
  { name: '帝座', ra: 253.0, dec: 14.0, distance: 600, magnitude: 3.1, spectrum: 'M3I' },
  { name: '河中', ra: 248.0, dec: 20.0, distance: 100, magnitude: 3.6, spectrum: 'G5V' },
  { name: '斗一', ra: 250.0, dec: 28.0, distance: 80, magnitude: 4.0, spectrum: 'F8V' },
  { name: '斗二', ra: 252.0, dec: 32.0, distance: 120, magnitude: 3.8, spectrum: 'A0V' },
  { name: '斗三', ra: 257.0, dec: 35.0, distance: 100, magnitude: 3.9, spectrum: 'G2V' },
  { name: '斗六', ra: 265.0, dec: 30.0, distance: 150, magnitude: 3.7, spectrum: 'A3V' },
  { name: '天市左垣一', ra: 270.0, dec: 25.0, distance: 200, magnitude: 3.5, spectrum: 'K0III' },
  { name: '天市右垣一', ra: 245.0, dec: 22.0, distance: 180, magnitude: 3.6, spectrum: 'F5V' },
  { name: '齐', ra: 268.0, dec: 28.0, distance: 160, magnitude: 3.9, spectrum: 'A7V' },
  { name: '赵', ra: 272.0, dec: 20.0, distance: 220, magnitude: 4.1, spectrum: 'G5V' },
  { name: '九河', ra: 260.0, dec: 18.0, distance: 250, magnitude: 4.2, spectrum: 'F0V' },
  { name: '吴越', ra: 262.0, dec: 12.0, distance: 280, magnitude: 4.0, spectrum: 'A2V' }
]);

addStars('cma', [
  { name: '天狼星 Sirius', ra: 101.29, dec: -16.72, distance: 8.6, magnitude: -1.46, spectrum: 'A1V' },
  { name: '弧矢一 Wezen', ra: 104.3, dec: -25.9, distance: 1790, magnitude: 1.83, spectrum: 'F8Ia' },
  { name: '弧矢七 Adhara', ra: 107.0, dec: -28.98, distance: 430, magnitude: 1.5, spectrum: 'B2II' },
  { name: '弧矢二', ra: 110.0, dec: -26.0, distance: 600, magnitude: 2.0, spectrum: 'B3V' },
  { name: '军市一 Mirzam', ra: 95.98, dec: -17.96, distance: 500, magnitude: 1.98, spectrum: 'B1II-III' },
  { name: '军市二', ra: 98.0, dec: -21.0, distance: 700, magnitude: 2.8, spectrum: 'B1V' },
  { name: '野鸡', ra: 90.5, dec: -15.5, distance: 300, magnitude: 3.5, spectrum: 'B9V' }
]);

addStars('cmi', [
  { name: '南河三 Procyon', ra: 114.83, dec: 5.23, distance: 11.4, magnitude: 0.34, spectrum: 'F5IV-V' },
  { name: '南河二', ra: 110.0, dec: 8.5, distance: 180, magnitude: 3.0, spectrum: 'A2V' },
  { name: '南河一', ra: 107.0, dec: 10.0, distance: 250, magnitude: 4.0, spectrum: 'F0V' },
  { name: '五诸侯三', ra: 118.0, dec: 2.0, distance: 200, magnitude: 3.8, spectrum: 'G5V' }
]);

addStars('cep', [
  { name: '天钩五 Alderamin', ra: 319.6, dec: 62.6, distance: 49, magnitude: 2.45, spectrum: 'A7IV-V' },
  { name: '上卫增一', ra: 310.0, dec: 68.0, distance: 150, magnitude: 3.5, spectrum: 'F0V' },
  { name: '天钩三', ra: 325.0, dec: 70.0, distance: 300, magnitude: 3.8, spectrum: 'K0III' },
  { name: '天钩二', ra: 335.0, dec: 75.0, distance: 200, magnitude: 4.2, spectrum: 'A3V' },
  { name: '天钩四', ra: 315.0, dec: 73.0, distance: 180, magnitude: 3.9, spectrum: 'G5V' },
  { name: '天钩六', ra: 305.0, dec: 71.0, distance: 250, magnitude: 4.0, spectrum: 'B8V' }
]);

addStars('dra', [
  { name: '天棓四', ra: 270.0, dec: 51.5, distance: 100, magnitude: 2.24, spectrum: 'K2III' },
  { name: '天棓三', ra: 256.0, dec: 51.0, distance: 150, magnitude: 2.73, spectrum: 'G9III' },
  { name: '天棓一', ra: 250.0, dec: 55.0, distance: 200, magnitude: 3.1, spectrum: 'A5V' },
  { name: '天棓二', ra: 262.0, dec: 57.0, distance: 180, magnitude: 3.3, spectrum: 'F0V' },
  { name: '紫微左垣一', ra: 220.0, dec: 70.0, distance: 250, magnitude: 3.6, spectrum: 'K5III' },
  { name: '紫微右垣一', ra: 240.0, dec: 73.0, distance: 300, magnitude: 3.8, spectrum: 'A2V' }
]);

const allConstellations: ConstellationData[] = [
  { id: 'orion', name: 'Orion', nameCn: '猎户座', lines: [[0, 1], [1, 2], [2, 3], [0, 3], [1, 4], [2, 5], [4, 6], [5, 6], [6, 7]], story: '猎户座是最壮观的星座之一。在希腊神话中，俄里翁是一位强大的猎人，他吹嘘自己能杀死任何动物。大地女神盖亚听到后很生气，派出一只蝎子去杀死他。后来，宙斯将俄里翁和蝎子都放到了天上，成为了猎户座和天蝎座。猎户座的腰带三星是夜空中最容易辨认的星象之一。', starIds: [] },
  { id: 'ursa_major', name: 'Ursa Major', nameCn: '大熊座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3], [1, 7], [2, 7]], story: '大熊座是北天最著名的星座之一，其中包含著名的北斗七星。在希腊神话中，宙斯爱上了美丽的卡利斯托，赫拉嫉妒不已，将她变成了一只大熊。后来宙斯将她升到天上成为大熊座。北斗七星是北半球最容易辨认的星象，常被用于寻找北极星。', starIds: [] },
  { id: 'ursa_minor', name: 'Ursa Minor', nameCn: '小熊座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]], story: '小熊座是北天星座，包含著名的北极星（勾陈一）。在希腊神话中，宙斯和卡利斯托的儿子阿卡斯长大后，在森林中遇到了变成熊的母亲，不知情的他正准备射杀。宙斯为了阻止悲剧，将阿卡斯也变成了小熊，一同升到天上成为小熊座。', starIds: [] },
  { id: 'cassiopeia', name: 'Cassiopeia', nameCn: '仙后座', lines: [[0, 1], [1, 2], [2, 3], [3, 4]], story: '仙后座以其W形的独特造型而闻名。在希腊神话中，卡西俄珀亚是埃塞俄比亚的王后，她因吹嘘自己和女儿比海神波塞冬的女儿们更美丽而惹怒了波塞冬。为了平息海神的愤怒，她的丈夫将女儿安德洛墨达献给海怪。后来，珀尔修斯救下了安德洛墨达。', starIds: [] },
  { id: 'leo', name: 'Leo', nameCn: '狮子座', lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [2, 7], [7, 8]], story: '狮子座是黄道十二宫之一，代表尼米亚狮子。在希腊神话中，赫拉克勒斯的十二项任务之一就是杀死这头刀枪不入的巨狮。赫拉克勒斯最终用双手勒死了狮子，并将它的皮作为自己的斗篷。宙斯为了纪念这次伟绩，将狮子升到了天上。', starIds: [] },
  { id: 'scorpius', name: 'Scorpius', nameCn: '天蝎座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [2, 9], [9, 10]], story: '天蝎座是夏季夜空中最壮观的星座之一，心宿二（又称"火星的对手"）是其最亮的红色超巨星。在希腊神话中，这只蝎子是大地女神盖亚派去杀死猎人俄里翁的。因此，猎户座和天蝎座在天空中遥遥相对，永远不会同时出现在天空中。', starIds: [] },
  { id: 'taurus', name: 'Taurus', nameCn: '金牛座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 5], [5, 6]], story: '金牛座是黄道十二宫之一，代表宙斯变成的白牛。在希腊神话中，宙斯爱上了腓尼基公主欧罗巴，便变成一头雪白的公牛接近她。欧罗巴被公牛的美丽吸引，骑上了牛背。宙斯趁机带着她越过大海来到克里特岛，两人在那里生下了米诺斯国王。', starIds: [] },
  { id: 'gemini', name: 'Gemini', nameCn: '双子座', lines: [[0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6], [5, 7], [6, 7]], story: '双子座是黄道十二宫之一，代表卡斯托尔和波吕丢刻斯这对双胞胎兄弟。在希腊神话中，兄弟俩情深意重。卡斯托尔是凡人，波吕丢刻斯是宙斯之子。当卡斯托尔战死后，波吕丢刻斯请求宙斯让他与兄弟分享永生。宙斯深受感动，将他们一同升上天成为星座。', starIds: [] },
  { id: 'andromeda', name: 'Andromeda', nameCn: '仙女座', lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]], story: '仙女座以埃塞俄比亚公主安德洛墨达命名。在希腊神话中，她的母亲卡西俄珀亚因吹嘘女儿的美貌惹怒了海神波塞冬。为了惩罚，波塞冬派海怪蹂躏埃塞俄比亚海岸。神谕要求将安德洛墨达献给海怪。就在海怪要吃掉她时，珀尔修斯骑着飞马赶到，救下了公主。', starIds: [] },
  { id: 'perseus', name: 'Perseus', nameCn: '英仙座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7]], story: '英仙座以希腊英雄珀尔修斯命名。珀尔修斯是宙斯和达那厄的儿子，他完成了许多英雄事迹，包括砍下美杜莎的头颅（凡是看到美杜莎眼睛的人都会变成石头）。后来，珀尔修斯在回家途中救下了被献给海怪的安德洛墨达公主，并与她结为夫妻。', starIds: [] },
  { id: 'cygnus', name: 'Cygnus', nameCn: '天鹅座', lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]], story: '天鹅座是夏季大三角的一部分，其最亮星天津四是北天最亮的恒星之一。在希腊神话中，宙斯为了接近斯巴达王后勒达，变成了一只天鹅。两人的结合诞生了海伦（后来引发特洛伊战争的绝世美女）和波吕丢刻斯。天鹅座因其十字形的形状也被称为"北十字"。', starIds: [] },
  { id: 'lyra', name: 'Lyra', nameCn: '天琴座', lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4]], story: '天琴座代表俄耳甫斯的竖琴。在希腊神话中，俄耳甫斯是一位伟大的音乐家，他的音乐能使石头流泪、野兽驯服。他的妻子欧律狄刻死后，他深入冥界试图用音乐打动冥王哈迪斯，希望能把妻子带回人间。虽然他几乎成功了，但在最后一刻回头看了一眼，导致永远失去了妻子。', starIds: [] },
  { id: 'aquila', name: 'Aquila', nameCn: '天鹰座', lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]], story: '天鹰座的主星牛郎星（河鼓二）与织女星、天津四组成著名的"夏季大三角"。在希腊神话中，宙斯的鹰是众神之王的使者和守护者，负责为众神斟酒的少年伽倪墨得斯就是被这只鹰带到奥林匹斯山的。在中国传说中，牛郎星是牛郎的化身，与织女星隔银河相望。', starIds: [] },
  { id: 'virgo', name: 'Virgo', nameCn: '室女座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7]], story: '室女座是黄道十二宫之一，代表正义女神阿斯特莱亚。在希腊神话中，人类进入铁器时代后变得越来越邪恶，众神纷纷离开人间返回天庭。阿斯特莱亚是最后一位离开的神祇。她升到天上后成为了室女座，而她手中的正义天平则变成了旁边的天秤座。', starIds: [] },
  { id: 'sagittarius', name: 'Sagittarius', nameCn: '人马座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 8], [8, 9]], story: '人马座是黄道十二宫之一，代表半人马喀戎。在希腊神话中，喀戎是一位智慧的半人马，是许多希腊英雄的老师，包括阿喀琉斯、伊阿宋和阿斯克勒庇俄斯。与其他野蛮的半人马不同，喀戎善良而博学。后来他被赫拉克勒斯的毒箭误伤，自愿放弃永生而死。', starIds: [] },
  { id: 'capricornus', name: 'Capricornus', nameCn: '摩羯座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 8]], story: '摩羯座是黄道十二宫之一，形象是半羊半鱼的怪物。在希腊神话中，牧神潘为了躲避怪物提丰，跳入尼罗河中变形逃跑。他的上半身变成了羊，下半身在水中变成了鱼。后来宙斯将他升上天空成为摩羯座。这个星座的最亮星是垒壁阵四。', starIds: [] },
  { id: 'aquarius', name: 'Aquarius', nameCn: '宝瓶座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 8]], story: '宝瓶座是黄道十二宫之一，代表为众神斟酒的少年伽倪墨得斯。在希腊神话中，伽倪墨得斯是特洛伊的一位美少年，宙斯变成一只鹰将他带到奥林匹斯山，让他担任斟酒童子的角色。他手中的宝瓶不断倾倒出水来，这被认为是雨水的来源，旁边的南鱼座则在接水。', starIds: [] },
  { id: 'pisces', name: 'Pisces', nameCn: '双鱼座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 8], [8, 9]], story: '双鱼座是黄道十二宫的最后一个星座，代表阿佛洛狄忒和厄洛斯母子。在希腊神话中，当怪物提丰攻击众神时，爱神阿佛洛狄忒和她的儿子厄洛斯变成两条鱼，跳入幼发拉底河中逃跑。为了防止失散，他们的尾巴用绳子系在了一起，这就是双鱼座两条鱼由丝带相连的由来。', starIds: [] },
  { id: 'aries', name: 'Aries', nameCn: '白羊座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6]], story: '白羊座是黄道十二宫的第一个星座，代表金羊毛的公羊。在希腊神话中，这只长着金羊毛的神奇公羊是赫尔墨斯派来拯救弗里克索斯和赫勒兄妹的。后来弗里克索斯将金羊毛献给了科尔喀斯国王，金羊毛成为了宝物，伊阿宋和阿尔戈英雄们的任务就是取回金羊毛。', starIds: [] },
  { id: 'cancer', name: 'Cancer', nameCn: '巨蟹座', lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [4, 5]], story: '巨蟹座是黄道十二宫之一，是黄道带中最暗的星座之一。在希腊神话中，当赫拉克勒斯与九头蛇海德拉战斗时，赫拉派了一只巨蟹去干扰他。巨蟹从沼泽中钻出，夹住了赫拉克勒斯的脚。但赫拉克勒斯一脚就把巨蟹踩得粉碎。为了嘉奖巨蟹的忠心，赫拉将它升到了天上。', starIds: [] },
  { id: 'libra', name: 'Libra', nameCn: '天秤座', lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [2, 5]], story: '天秤座是黄道十二宫之一，代表正义的天平。在希腊神话中，正义女神阿斯特莱亚用这架天平来衡量人类的善恶。当人类变得越来越邪恶时，阿斯特莱亚伤心地离开了人间。她升上天成为室女座，而她的天平则成为了天秤座，继续作为公正和正义的象征。', starIds: [] },
  { id: 'bootes', name: 'Bootes', nameCn: '牧夫座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7]], story: '牧夫座的主星大角星是夜空中第四亮的恒星。在希腊神话中，牧人伊卡里俄斯从狄俄尼索斯那里得到了酿酒的技艺，成为了第一个酿酒的人。但他的山羊吃掉了葡萄藤，伊卡里俄斯生气地杀死了山羊。后来他因为让农夫喝醉而被误杀，宙斯将他升上天成为牧夫座。', starIds: [] },
  { id: 'hercules', name: 'Hercules', nameCn: '武仙座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [2, 8], [8, 9], [3, 10], [10, 11]], story: '武仙座以希腊最伟大的英雄赫拉克勒斯命名。赫拉克勒斯是宙斯和阿尔克墨涅的儿子，拥有超凡的力量。他完成了著名的十二项功绩，包括杀死尼米亚狮子、斩杀九头蛇海德拉、捕获阿尔忒弥斯的赤牝鹿等。死后，他被升上天成为星座，永远展示着他的英雄事迹。', starIds: [] },
  { id: 'canis_major', name: 'Canis Major', nameCn: '大犬座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [5, 6]], story: '大犬座包含夜空中最亮的恒星——天狼星。在希腊神话中，大犬座是猎人俄里翁的忠实猎犬。俄里翁死后被升上天成为猎户座，他的猎犬也紧随其后成为大犬座。天狼星在古埃及被视为神圣之星，它的偕日升预示着尼罗河的泛滥，对古埃及农业至关重要。', starIds: [] },
  { id: 'canis_minor', name: 'Canis Minor', nameCn: '小犬座', lines: [[0, 1], [1, 2], [2, 3]], story: '小犬座与大犬座一起，都是猎人俄里翁的猎犬。小犬座的主星南河三是夜空中第八亮的恒星。小犬座虽然只有两颗明亮的恒星，但在冬季星空中非常显眼，它与天狼星、参宿四共同组成了著名的"冬季大三角"。', starIds: [] },
  { id: 'cepheus', name: 'Cepheus', nameCn: '仙王座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], story: '仙王座以埃塞俄比亚国王刻甫斯命名，他是卡西俄珀亚的丈夫，安德洛墨达的父亲。在希腊神话中，因为王后吹嘘女儿的美貌惹怒了海神，刻甫斯不得不将女儿献给海怪。幸运的是，珀尔修斯及时赶到救下了公主。仙王座位于北天，形状像一个尖顶的塔。', starIds: [] },
  { id: 'draco', name: 'Draco', nameCn: '天龙座', lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], story: '天龙座是北天星座，蜿蜒盘旋在北天极附近。在希腊神话中，这条龙是守护金苹果圣园的百头巨龙拉冬。赫拉克勒斯的十二项任务之一就是摘取金苹果，他最终用箭射死了拉冬。为了纪念这条龙，宙斯将它升到了天上，成为天龙座。', starIds: [] }
];

function raDecToXYZ(ra: number, dec: number, distance: number): [number, number, number] {
  const raRad = (ra * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  const scale = 0.15;
  const x = distance * Math.cos(decRad) * Math.cos(raRad) * scale;
  const y = distance * Math.sin(decRad) * scale;
  const z = distance * Math.cos(decRad) * Math.sin(raRad) * scale;
  return [x, y, z];
}

function spectrumToColor(spectrum: string): string {
  if (spectrum.startsWith('O')) return '#9bb0ff';
  if (spectrum.startsWith('B')) return '#aabfff';
  if (spectrum.startsWith('A')) return '#cad7ff';
  if (spectrum.startsWith('F')) return '#f8f7ff';
  if (spectrum.startsWith('G')) return '#fff4ea';
  if (spectrum.startsWith('K')) return '#ffd2a1';
  if (spectrum.startsWith('M')) return '#ffcc6f';
  return '#ffffff';
}

function getConstellationStarIds(constellationId: string): string[] {
  const prefixMap: { [key: string]: string } = {
    'orion': 'orion',
    'ursa_major': 'uma',
    'ursa_minor': 'umi',
    'cassiopeia': 'cas',
    'leo': 'leo',
    'scorpius': 'sco',
    'taurus': 'tau',
    'gemini': 'gem',
    'andromeda': 'and',
    'perseus': 'per',
    'cygnus': 'cyg',
    'lyra': 'lyr',
    'aquila': 'aql',
    'virgo': 'vir',
    'sagittarius': 'sgr',
    'capricornus': 'cap',
    'aquarius': 'aqr',
    'pisces': 'psc',
    'aries': 'ari',
    'cancer': 'cnc',
    'libra': 'lib',
    'bootes': 'boo',
    'hercules': 'her',
    'canis_major': 'cma',
    'canis_minor': 'cmi',
    'cepheus': 'cep',
    'draco': 'dra'
  };
  const prefix = prefixMap[constellationId] || constellationId;
  const ids: string[] = [];
  let i = 1;
  while (starDefs[`${prefix}-${i}`]) {
    ids.push(`${prefix}-${i}`);
    i++;
  }
  return ids;
}

export function getStars(): StarData[] {
  const stars: StarData[] = [];
  
  for (const [id, def] of Object.entries(starDefs)) {
    const [x, y, z] = raDecToXYZ(def.ra, def.dec, def.distance);
    let constellation = '未知';
    for (const c of allConstellations) {
      const ids = getConstellationStarIds(c.id);
      if (ids.includes(id)) {
        constellation = c.nameCn;
        break;
      }
    }
    stars.push({
      id,
      name: def.name,
      constellation,
      x, y, z,
      magnitude: def.magnitude,
      spectrum: def.spectrum,
      color: spectrumToColor(def.spectrum),
      distance: def.distance
    });
  }
  
  return stars;
}

export function getConstellations(): ConstellationData[] {
  return allConstellations.map(c => ({
    ...c,
    starIds: getConstellationStarIds(c.id)
  }));
}

export function generateBackgroundStars(count: number): { x: number; y: number; z: number; size: number; color: string }[] {
  const stars: { x: number; y: number; z: number; size: number; color: string }[] = [];
  const colors = ['#ffffff', '#aabfff', '#ffd2a1', '#cad7ff', '#f8f7ff'];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 400 + Math.random() * 200;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const size = 0.3 + Math.random() * 1.2;
    const colorIndex = Math.floor(Math.random() * colors.length);
    stars.push({ x, y, z, size, color: colors[colorIndex] });
  }
  return stars;
}

export function generateNebulaParticles(count: number): { x: number; y: number; z: number; size: number; color: string; speed: number }[] {
  const particles: { x: number; y: number; z: number; size: number; color: string; speed: number }[] = [];
  const colors = ['rgba(147, 112, 219, 0.3)', 'rgba(100, 149, 237, 0.3)', 'rgba(255, 182, 193, 0.2)', 'rgba(135, 206, 235, 0.25)'];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 350 + Math.random() * 100;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const size = 2 + Math.random() * 8;
    const colorIndex = Math.floor(Math.random() * colors.length);
    const speed = 0.005 + Math.random() * 0.02;
    particles.push({ x, y, z, size, color: colors[colorIndex], speed });
  }
  return particles;
}