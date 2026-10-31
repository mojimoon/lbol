import assert from 'node:assert/strict'
import { COLLECTIONS, applyCollection, canAfford, costBucket, decodeState, encodeState, inCardPool, inRoll, matchesColors, poolLink } from './collections.js'

// The in-game colour rules, per MuseumPanel.FilterCardByMana.
const WB = ['W', 'B'], W = ['W'], B = ['B'], R = ['R'], WU = ['W', 'U'], WBG = ['W', 'B', 'G'], none = [], C = ['C']
assert.ok(matchesColors(R, []))
for (const colors of [W, B, WB, WU, WBG]) assert.ok(matchesColors(colors, ['W', 'B']), `W+B keeps ${colors}`)
assert.ok(!matchesColors(R, ['W', 'B']))
for (const colors of [WB, WBG]) assert.ok(matchesColors(colors, ['W', 'B', 'P']), `W+B+P keeps ${colors}`)
for (const colors of [W, B, WU]) assert.ok(!matchesColors(colors, ['W', 'B', 'P']), `W+B+P drops ${colors}`)
assert.ok(matchesColors(WU, ['P']) && !matchesColors(W, ['P']) && !matchesColors(none, ['P']))
assert.ok(matchesColors(none, ['C']) && matchesColors(C, ['C']) && !matchesColors(W, ['C']))

assert.equal(costBucket({ isX: true, total: 2 }), 'X')
assert.equal(costBucket({ isX: false, total: 7 }), '5+')

// Examples from the game's own card pool rules: base mana WWRRBPC.
const base = { W: 2, U: 0, B: 1, R: 2, G: 0, C: 1, P: 1 }
const pool = { mana: base, owners: ['Reimu', 'Marisa'], blank: false }
const poolCard = (cost, colors, over = {}) => ({ pooled: true, owner: null, poolCost: cost, colors, ...over })
assert.ok(inCardPool(poolCard({ B: 2 }, ['B']), pool), 'BB: paid with B + P')
assert.ok(!inCardPool(poolCard({ U: 1, B: 1 }, ['U', 'B']), pool), 'UB: no blue base mana, even if P could pay')
assert.ok(inCardPool(poolCard({ U: 1, B: 1 }, ['U', 'B']), { ...pool, blank: true }), 'Blank Card drops the colour rule')
assert.ok(!inCardPool(poolCard({ B: 3 }, ['B']), { ...pool, blank: true }), 'but the cost must still be payable')
assert.ok(inCardPool(poolCard({ Any: 3, W: 3 }, ['W']), pool), 'total 6: generic part ignored (WWW via P)')
assert.ok(!inCardPool(poolCard({ Any: 4, W: 1 }, ['W']), { ...pool, mana: { ...base, W: 1, R: 0, B: 0, C: 0, P: 0 } }), 'total 5: generic part still counts')
assert.ok(!inCardPool(poolCard({}, [], { pooled: false }), pool), 'cards outside the random pool are excluded')
assert.ok(!inCardPool(poolCard({}, [], { owner: 'Cirno' }), pool) && inCardPool(poolCard({}, [], { owner: 'Marisa' }), pool))
assert.ok(inCardPool(poolCard({ C: 1 }, ['C']), pool) && !inCardPool(poolCard({ C: 2 }, ['C']), { ...pool, mana: { ...base, C: 0, P: 2 } }), 'colourless needs C base mana')
// Hybrid: cost WR (index 2) x2 is payable by W + R, or by P when short.
assert.ok(canAfford({ W: 1, R: 1 }, { Hybrid: 2, HybridColor: 2 }))
assert.ok(canAfford({ W: 1, P: 1 }, { Hybrid: 2, HybridColor: 2 }))
assert.ok(!canAfford({ W: 1, U: 1 }, { Hybrid: 2, HybridColor: 2 }))
assert.ok(canAfford({ W: 1, U: 1 }, { Hybrid: 2 }), 'HybridColor 0 (WU) is dropped from the data')
assert.ok(!canAfford({ W: 1 }, { Any: 1, W: 1 }), 'generic needs mana left over')

const cards = COLLECTIONS.find(c => c.key === 'cards')
const card = (id, index, over = {}) => ({
  id, index, name: id, search: id.toLowerCase(), hidden: false, owner: null, type: 'Attack', rarity: 'Common', colors: [],
  base: { total: 1, isX: false, keywords: [] }, up: null, alts: [], illustrator: null, special: [], ...over,
})
const rows = [
  card('a', 2, { base: { total: 3, isX: false, keywords: ['Exile'] }, rarity: 'Rare' }),
  card('b', 1, { base: { total: 0, isX: true, keywords: [] } }),
  card('c', 3, { hidden: true }),
  card('d', 4, { owner: 'Reimu', up: { total: 0, isX: false, keywords: ['Exile'] } }),
]
const run = (state, upgraded = false) =>
  applyCollection(cards, rows, { search: '', sort: 'default', descending: false, facets: {}, ...cards.initialState(), ...state }, { upgraded }).map(r => r.id)

assert.deepEqual(run({}), ['b', 'a', 'd'], 'hidden cards are not listed')
assert.deepEqual(run({ sort: 'cost' }), ['d', 'a', 'b'], 'X cost sorts last')
assert.deepEqual(run({ sort: 'rarity', descending: true }), ['a', 'd', 'b'])
assert.deepEqual(run({ search: 'A' }), ['a'])
assert.deepEqual(run({ facets: { owner: ['Neutral'] } }), ['b', 'a'])
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }), ['a'], 'keywords follow the base face')
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }, true), ['a', 'd'], 'and the upgraded face when toggled')
assert.deepEqual(run({ facets: { owner: ['Neutral'], cost: ['X'] } }), ['b'], 'facets AND together')
assert.deepEqual(run({ sort: 'illustrator' }), ['b', 'a', 'd'], 'ties fall back to index')

assert.deepEqual(run({ facets: { special: ['multi'] } }), [])

// Random ranges
const rollCard = over => ({ id: 'x', pooled: true, findInBattle: true, gadget: false, type: 'Ability', rarity: 'Rare', owner: null, colors: [], poolCost: { Any: 2 }, ...over })
const snake = { types: ['Ability'], rarities: ['Rare'], neutral_only: true }
assert.ok(inRoll(rollCard(), snake))
assert.ok(!inRoll(rollCard({ owner: 'Reimu' }), snake), 'neutral only')
assert.ok(!inRoll(rollCard({ rarity: 'Common' }), snake) && !inRoll(rollCard({ type: 'Skill' }), snake))
assert.ok(!inRoll(rollCard({ pooled: false }), snake) && !inRoll(rollCard({ findInBattle: false }), snake), 'must be rollable in battle')
assert.ok(!inRoll(rollCard({ gadget: true }), snake), 'Gadgets stay out of rolls')
assert.ok(inRoll(rollCard(), { types: ['Ability'], rarities: ['Rare'], cost_min: 2, cost_max: 2 }))
assert.ok(!inRoll(rollCard(), { types: ['Ability'], rarities: ['Rare'], cost_max: 1 }))
const within = { types: ['Ability'], rarities: ['Rare'], colors_within: ['W', 'U'] }
assert.ok(inRoll(rollCard({ colors: ['W', 'U'] }), within) && !inRoll(rollCard({ colors: ['W', 'R'] }), within) && !inRoll(rollCard(), within))
assert.ok(!inRoll(rollCard({ id: 'me' }), { types: ['Ability'], rarities: ['Rare'], exclude: ['me'] }))
assert.equal(applyCollection(cards, [card('r', 1)], { ...decodeState(cards, 'roll=z') }, { rollSpec: { types: ['Skill'], rarities: ['Common'] } }).length, 0, 'roll filter applies')

// URL round trip
const empty = decodeState(cards, '')
assert.equal(encodeState(cards, empty), '', 'defaults stay out of the URL')
const filled = { ...decodeState(cards, ''), search: 'a b', sort: 'cost', descending: true }
filled.facets.owner = ['Reimu', 'Neutral']
filled.facets.illustrator = ['Ferdy (IFC), x&y']
Object.assign(filled.pool, { enabled: true, owners: ['Marisa'], blank: true })
filled.pool.mana.W = 2
assert.deepEqual(decodeState(cards, encodeState(cards, filled)), filled)
assert.equal(decodeState(cards, 'sort=nope').sort, 'default', 'unknown sort falls back')
assert.equal(decodeState(cards, encodeState(cards, { ...empty, roll: 'ZoufangSnake' })).roll, 'ZoufangSnake')
assert.equal(decodeState(cards, 'pool=x.-3').pool.mana.U, 0, 'bad counts become 0')
assert.equal(poolLink({ id: 'Reimu' }, { mana: ['R', 'R', 'R', 'W', 'W'] }), '#/cards?pool=2.0.0.3.0.0.0&poolOwner=Reimu')
console.log('collections ok')
