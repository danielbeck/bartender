import { glassInteriors } from './glassProfiles.js'
import library from '../../../data/cocktails.json' with { type: 'json' }

const ingredientColors = new Map(library.ingredients.map(({ id, color }) => [id, color]))
const ingredientColorsByName = new Map(library.ingredients.map(({ name, color }) => [name.toLowerCase(), color]))

export function ingredientColor(id) {
  if (!ingredientColors.has(id)) throw new Error(`Unknown ingredient color: ${id}`)
  const color = ingredientColors.get(id)
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`Ingredient ${id} must define a six-digit hex color`)
  }
  return color
}

export function ingredientVolumes(ingredients) {
  return ingredients.flatMap((ingredient, index) => {
    const match = ingredient.amount.match(/^(\d+(?:\.\d+)?) ml$/)
    const volume = match ? Number(match[1]) : 0
    if (volume <= 0) return []
    const libraryColor = ingredientColorsByName.get(ingredient.name.trim().toLowerCase())
    const color = ingredient.ingredientId ? ingredientColor(ingredient.ingredientId) : libraryColor || ingredient.color
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new Error(`Ingredient ${ingredient.name} must define a six-digit hex color`)
    }
    return [{ ...ingredient, index, volume, color }]
  })
}

export function polygonArea(points) {
  return Math.abs(points.reduce((area, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return area + x * nextY - nextX * y
  }, 0)) / 2
}

export function polygonBelow(points, height) {
  const clipped = []
  points.forEach((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    if ((point[1] >= height) !== (previous[1] >= height)) {
      const fraction = (height - previous[1]) / (point[1] - previous[1])
      clipped.push([previous[0] + fraction * (point[0] - previous[0]), height])
    }
    if (point[1] >= height) clipped.push(point)
  })
  return clipped
}

export function glassFill(glass, ingredients) {
  const interior = glassInteriors[glass]
  if (!interior) throw new Error(`Unknown glass interior: ${glass}`)
  const volumes = ingredientVolumes(ingredients)
  const total = volumes.reduce((sum, { volume }) => sum + volume, 0)
  const top = Math.min(...interior.map(([, y]) => y))
  const bottom = Math.max(...interior.map(([, y]) => y))
  const area = polygonArea(interior)
  let accumulated = 0
  let previousHeight = bottom

  const bands = volumes.map((ingredient, index) => {
    accumulated += ingredient.volume
    let low = top
    let high = bottom
    // Solve by filled area so tapered bowls retain the requested ingredient ratios.
    for (let iteration = 0; iteration < 40; iteration++) {
      const midpoint = (low + high) / 2
      if (polygonArea(polygonBelow(interior, midpoint)) > area * accumulated / total) low = midpoint
      else high = midpoint
    }
    const height = index === volumes.length - 1 ? top : (low + high) / 2
    const band = { ...ingredient, y: height, height: previousHeight - height, proportion: ingredient.volume / total }
    previousHeight = height
    return band
  })
  return { interior, bands }
}
