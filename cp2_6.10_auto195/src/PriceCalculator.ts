import type { RawMaterial, Procedure } from './data'

export interface CostResult {
  rawMaterialCost: number
  laborCost: number
  totalCost: number
  suggestedPrice: number
}

const HOURLY_WAGE_RATE = 80
const PROFIT_MARGIN = 1.8

export function calculateCost(
  rawMaterials: RawMaterial[],
  procedures: Procedure[]
): CostResult {
  const rawMaterialCost = rawMaterials.reduce(
    (sum, mat) => sum + mat.unitPrice * mat.quantity,
    0
  )

  const laborCost = procedures.reduce((sum, proc) => {
    const hours = proc.duration / 60
    return sum + hours * HOURLY_WAGE_RATE * proc.proficiencyCoefficient
  }, 0)

  const totalCost = rawMaterialCost + laborCost
  const suggestedPrice = Number((totalCost * PROFIT_MARGIN).toFixed(2))

  return {
    rawMaterialCost: Number(rawMaterialCost.toFixed(2)),
    laborCost: Number(laborCost.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    suggestedPrice
  }
}

export function getProfitMargin(): number {
  return PROFIT_MARGIN
}

export function getHourlyWageRate(): number {
  return HOURLY_WAGE_RATE
}
