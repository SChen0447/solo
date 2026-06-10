export interface Product {
  id: number
  name: string
  originalPrice: number
  salePrice: number
  image: string
}

export const products: Product[] = [
  {
    id: 1,
    name: '轻奢无线蓝牙耳机 Pro',
    originalPrice: 599,
    salePrice: 199,
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20bluetooth%20earbuds%20product%20photo%20white%20background%20professional%20ecommerce&image_size=landscape_4_3'
  },
  {
    id: 2,
    name: '智能运动手环 健康监测版',
    originalPrice: 399,
    salePrice: 129,
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20fitness%20band%20watch%20product%20photo%20white%20background%20professional%20ecommerce&image_size=landscape_4_3'
  },
  {
    id: 3,
    name: '便携式蓝牙音箱 户外防水',
    originalPrice: 459,
    salePrice: 159,
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portable%20bluetooth%20speaker%20product%20photo%20white%20background%20professional%20ecommerce&image_size=landscape_4_3'
  },
  {
    id: 4,
    name: '超薄充电宝 20000mAh',
    originalPrice: 299,
    salePrice: 89,
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ultra%20thin%20power%20bank%20portable%20charger%20product%20photo%20white%20background%20professional%20ecommerce&image_size=landscape_4_3'
  }
]
