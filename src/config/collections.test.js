import assert from 'node:assert/strict'
import { COLLECTIONS, applyCollection, costBucket, matchesColors } from './collections.js'

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

const cards = COLLECTIONS.find(c => c.key === 'cards')
const card = (id, index, over = {}) => ({
  id, index, name: id, search: id.toLowerCase(), hidden: false, owner: null, type: 'Attack', rarity: 'Common', colors: [],
  base: { total: 1, isX: false, keywords: [] }, up: null, ...over,
})
const rows = [
  card('a', 2, { base: { total: 3, isX: false, keywords: ['Exile'] }, rarity: 'Rare' }),
  card('b', 1, { base: { total: 0, isX: true, keywords: [] } }),
  card('c', 3, { hidden: true }),
  card('d', 4, { owner: 'Reimu', up: { total: 0, isX: false, keywords: ['Exile'] } }),
]
const run = (state, upgraded = false) =>
  applyCollection(cards, rows, { search: '', sort: 'default', descending: false, facets: {}, ...state }, { upgraded }).map(r => r.id)

assert.deepEqual(run({}), ['b', 'a', 'd'], 'hidden cards are not listed')
assert.deepEqual(run({ sort: 'cost' }), ['d', 'a', 'b'], 'X cost sorts last')
assert.deepEqual(run({ sort: 'rarity', descending: true }), ['a', 'd', 'b'])
assert.deepEqual(run({ search: 'A' }), ['a'])
assert.deepEqual(run({ facets: { owner: ['Neutral'] } }), ['b', 'a'])
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }), ['a'], 'keywords follow the base face')
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }, true), ['a', 'd'], 'and the upgraded face when toggled')
assert.deepEqual(run({ facets: { owner: ['Neutral'], cost: ['X'] } }), ['b'], 'facets AND together')
console.log('collections ok')
