const milliliterAmount = (amount) => amount.match(/^(\d+(?:\.\d+)?) ml$/)
export const millilitersPerShot = 45

function formatQuarterQuantity(quarters) {
  const fractions = ['', '¼', '½', '¾']
  const whole = Math.floor(quarters / 4)
  const fraction = fractions[quarters % 4]
  return [whole || !fraction ? String(whole) : '', fraction].filter(Boolean).join(' ')
}

export function recipeShots(ingredients) {
  return ingredients.map(({ amount }) => {
    const measurement = milliliterAmount(amount)
    if (!measurement) return amount
    const volume = Number(measurement[1])
    const quarters = Math.round(volume / millilitersPerShot * 4)
    const quantity = formatQuarterQuantity(quarters)
    return `${quantity} ${quarters > 0 && quarters <= 4 ? 'shot' : 'shots'}`
  })
}

export function recipeParts(ingredients) {
  const measurements = ingredients.map(({ amount }) => milliliterAmount(amount))
  const volumes = measurements.filter(Boolean)
  if (!volumes.length) {
    return { amounts: ingredients.map(({ amount }) => amount), millilitersPerPart: null, rounded: false }
  }

  const numericVolumes = volumes.map((match) => Number(match[1]))
  const largestVolume = Math.max(...numericVolumes)
  if (!largestVolume) throw new Error('Recipe volumes must include a positive amount')
  const candidates = []
  const step = Math.min(2.5, largestVolume)
  for (let measure = step; measure <= largestVolume; measure += step) {
    const parts = numericVolumes.map((volume) =>
      volume > 0 ? Math.min(4.75, Math.max(0.25, Math.round(volume / measure * 4) / 4)) : 0)
    const errors = numericVolumes.map((volume, index) =>
      volume > 0 ? Math.abs(parts[index] * measure - volume) / volume : 0)
    candidates.push({
      measure,
      maximumError: Math.max(...errors),
      totalError: errors.reduce((sum, error) => sum + error, 0),
      fractions: parts.filter((part) => !Number.isInteger(part)).length,
      complexity: parts.reduce((sum, part) => sum + (Number.isInteger(part) ? 0 : Number.isInteger(part * 2) ? 1 : 2), 0),
      totalParts: parts.reduce((sum, part) => sum + part, 0),
    })
  }
  // If the size limits force more than 10% error, prioritize accuracy over simplicity.
  const acceptable = candidates.filter(({ maximumError }) => maximumError <= 0.1 + Number.EPSILON)
  const choices = acceptable.length ? acceptable : candidates
  choices.sort((first, second) =>
    (!acceptable.length ? first.maximumError - second.maximumError : 0)
    || first.fractions - second.fractions
    || first.complexity - second.complexity
    || first.totalError - second.totalError
    || first.totalParts - second.totalParts)
  const millilitersPerPart = choices[0].measure

  let rounded = false
  const amounts = ingredients.map(({ amount }, index) => {
    if (!measurements[index]) return amount
    const exactParts = Number(measurements[index][1]) / millilitersPerPart
    const parts = exactParts > 0 ? Math.min(4.75, Math.max(0.25, Math.round(exactParts * 4) / 4)) : 0
    if (Math.abs(parts * millilitersPerPart - Number(measurements[index][1])) > 1e-9) rounded = true
    return `${formatQuarterQuantity(parts * 4)} ${parts === 1 ? 'part' : 'parts'}`
  })

  return {
    amounts,
    millilitersPerPart,
    rounded,
  }
}
