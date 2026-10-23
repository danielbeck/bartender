import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { glassFill, ingredientColor, ingredientVolumes, polygonArea, polygonBelow } from './glassFill.js'
import { glassInteriors } from './glassProfiles.js'

const library = JSON.parse(readFileSync(new URL('../../../data/cocktails.json', import.meta.url), 'utf8'))

test('every ingredient defines a valid source color used by the illustration', () => {
  for (const ingredient of library.ingredients) {
    assert.match(ingredient.color, /^#[0-9a-f]{6}$/i, ingredient.id)
    assert.equal(ingredientColor(ingredient.id), ingredient.color)
  }
  const menthe = ingredientColor('creme-de-menthe')
  const red = Number.parseInt(menthe.slice(1, 3), 16)
  const green = Number.parseInt(menthe.slice(3, 5), 16)
  const blue = Number.parseInt(menthe.slice(5, 7), 16)
  assert.ok(green > red && green > blue)
  assert.throws(() => ingredientColor('unknown'), /Unknown ingredient color/)
})

test('every glass has a positive-area liquid interior', () => {
  assert.deepEqual(Object.keys(glassInteriors).sort(), library.taxonomy.glasses.map(({ id }) => id).sort())
  for (const polygon of Object.values(glassInteriors)) assert.ok(polygonArea(polygon) > 0)
})

test('band areas match original ml proportions for every recipe', () => {
  for (const cocktail of library.cocktails) {
    const { interior, bands } = glassFill(cocktail.glass, cocktail.ingredients)
    const area = polygonArea(interior)
    const totalVolume = bands.reduce((sum, { volume }) => sum + volume, 0)
    for (const band of bands) {
      const bandArea = polygonArea(polygonBelow(interior, band.y))
        - polygonArea(polygonBelow(interior, band.y + band.height))
      assert.ok(Math.abs(bandArea / area - band.volume / totalVolume) < 1e-8,
        `${cocktail.id}: ${band.name}`)
      assert.ok(band.height > 0)
    }
    const filledArea = bands.reduce((sum, band) => sum + polygonArea(polygonBelow(interior, band.y))
      - polygonArea(polygonBelow(interior, band.y + band.height)), 0)
    assert.ok(Math.abs(filledArea - area) < 1e-8, cocktail.id)
  }
})

test('tapered glasses use areas rather than proportional heights', () => {
  const { bands } = glassFill('martini', [
    { ingredientId: 'gin', name: 'gin', amount: '30 ml' },
    { ingredientId: 'dry-vermouth', name: 'vermouth', amount: '30 ml' },
  ])
  assert.ok(bands[0].height > bands[1].height)
  assert.equal(bands[0].proportion, 0.5)
  assert.equal(bands[1].proportion, 0.5)
})

test('only ml measurements are represented and ingredient order is preserved', () => {
  const ingredients = [
    { ingredientId: 'gin', name: 'gin', amount: '45 ml' },
    { ingredientId: 'egg-white', name: 'egg white', amount: '1 (optional)' },
    { ingredientId: 'lemon-juice', name: 'lemon juice', amount: '15 ml' },
    { ingredientId: 'aromatic-bitters', name: 'bitters', amount: '2 dashes' },
    { ingredientId: 'crushed-ice', name: 'ice', amount: '1 cup' },
  ]
  const snapshot = structuredClone(ingredients)
  const volumes = ingredientVolumes(ingredients)
  assert.deepEqual(volumes.map(({ index, volume }) => [index, volume]), [[0, 45], [2, 15]])
  assert.deepEqual(glassFill('rocks', []).bands, [])
  assert.deepEqual(glassFill('rocks', ingredients.slice(3)).bands, [])
  assert.deepEqual(ingredients, snapshot)
  assert.equal(ingredientColor('gin'), ingredientColor('gin'))
  assert.equal(ingredientColor('amaro'), ingredientColor('amaro'))
  assert.throws(() => glassFill('unknown', ingredients), /Unknown glass interior/)
})

test('invented ingredients use library colors when names match regardless of case', () => {
  const volumes = ingredientVolumes([
    { name: 'Grapefruit juice', amount: '45 ml', color: '#00ff00' },
    { name: 'Unlisted ingredient', amount: '15 ml', color: '#00ff00' },
  ])
  assert.equal(volumes[0].color, ingredientColor('grapefruit-juice'))
  assert.equal(volumes[1].color, '#00ff00')
})
