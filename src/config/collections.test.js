import assert from 'node:assert/strict'
import { visibleRows } from '../composables/gridWindow.js'
import { COLLECTIONS, applyCollection, canAfford, costBucket, decodeState, encodeState, inCardPool, inRoll, matchesColors, poolLink, resolvePool, shiningExhibits, startingPool } from './collections.js'

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
assert.ok(!inCardPool(poolCard({}, [], { type: 'Tool' }), pool) && inCardPool(poolCard({}, [], { type: 'Skill' }), pool), 'tools are shop-only')
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
const forbiddenRows = [card('f', 1, { base: { total: 0, isX: false, forbidden: true, keywords: [] } }), card('g', 2, { base: { total: 5, isX: false, forbidden: false, keywords: ['Forbidden'] } })]
assert.deepEqual(applyCollection(cards, forbiddenRows, { search: '', sort: 'cost', descending: false, facets: {}, ...cards.initialState() }, {}).map(r => r.id), ['g', 'f'],
  'forbidden cards sort last; only mentioning the keyword does not count')
assert.deepEqual(run({ sort: 'rarity', descending: true }), ['a', 'd', 'b'])
assert.deepEqual(run({ search: 'A' }), ['a'])
assert.deepEqual(run({ facets: { owner: ['Neutral'] } }), ['b', 'a'])
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }), ['a'], 'keywords follow the base face')
assert.deepEqual(run({ facets: { keyword: ['Exile'] } }, true), ['a', 'd'], 'and the upgraded face when toggled')
assert.deepEqual(run({ facets: { owner: ['Neutral'], cost: ['X'] } }), ['b'], 'facets AND together')
assert.deepEqual(run({ sort: 'illustrator' }), ['b', 'a', 'd'], 'ties fall back to index')

assert.deepEqual(run({ facets: { special: ['multi'] } }), [])
const pooledRows = [card('in', 1, { pooled: true }), card('out', 2, { pooled: false })]
const byPool = value => applyCollection(cards, pooledRows, { search: '', sort: 'default', descending: false, facets: { cardPool: [value] }, ...cards.initialState() }, {}).map(r => r.id)
assert.deepEqual(byPool('in'), ['in'])
assert.deepEqual(byPool('out'), ['out'])

const effectRows = [card('e1', 1, { base: { total: 1, isX: false, keywords: [], effects: ['Weak'] }, up: { total: 1, isX: false, keywords: [], effects: ['Weak', 'Poison'] } }), card('e2', 2, { base: { total: 1, isX: false, keywords: [], effects: [] } })]
const byEffect = (value, upgraded) => applyCollection(cards, effectRows, { search: '', sort: 'default', descending: false, facets: { mechanic: [value] }, ...cards.initialState() }, { upgraded }).map(r => r.id)
assert.deepEqual(byEffect('Weak'), ['e1'])
assert.deepEqual(byEffect('Poison', false), [], 'effects follow the base face')
assert.deepEqual(byEffect('Poison', true), ['e1'], 'and the upgraded face when toggled')
assert.equal(cards.facets.findIndex(f => f.key === 'mechanic'), cards.facets.findIndex(f => f.key === 'keyword') + 1, 'mechanic sits under keyword')

// Virtual scrolling: one screen of rows either way, within the list
assert.deepEqual(visibleRows(0, 900, 300, 100), [0, 6], 'at the top')
assert.deepEqual(visibleRows(-3000, 900, 300, 100), [7, 16], 'mid list')
assert.deepEqual(visibleRows(-3000, 900, 300, 5), [5, 5], 'scrolled past a list that just shrank')
assert.deepEqual(visibleRows(200, 900, 300, 3), [0, 3], 'short list below the page top')

// Reward pool inputs
const poolData = {
  characters: [
    { id: 'Reimu', colors: ['R', 'W'], loadouts: { A: { exhibit: 'ReimuR' }, B: { exhibit: 'ReimuW' } } },
    { id: 'Marisa', colors: ['B', 'R'], loadouts: { A: { exhibit: 'MarisaB' }, B: { exhibit: 'MarisaR' } } },
  ],
  exhibits: [
    { id: 'ReimuR', rarity: 'Shining', baseMana: 'R', baseManaAmount: 1, owner: 'Reimu' },
    { id: 'ReimuW', rarity: 'Shining', baseMana: 'W', baseManaAmount: 1, owner: 'Reimu' },
    { id: 'MarisaB', rarity: 'Shining', baseMana: 'B', baseManaAmount: 1, owner: 'Marisa' },
    { id: 'Yuerang', rarity: 'Shining', baseMana: 'C', baseManaAmount: 2, owner: null },
    { id: 'KongbaiKapai', rarity: 'Shining', baseMana: 'P', baseManaAmount: 1, owner: null },
    { id: 'Lianhua', rarity: 'Shining', baseMana: null, baseManaAmount: 0, owner: null },
    { id: 'Yu', rarity: 'Mythic', baseMana: 'P', baseManaAmount: 1, owner: null },
  ],
}
const resolved = over => resolvePool(poolData, { route: 'Reimu.A', exhibits: ['ReimuR'], purify: null, refine: null, ...over })
assert.deepEqual(resolved().mana, { W: 2, U: 0, B: 0, R: 3, G: 0, C: 0, P: 0 }, 'starting mana of a route')
assert.deepEqual(resolved().owners, ['Reimu'])
assert.deepEqual(resolved({ exhibits: [] }).owners, ['Reimu'], 'trading the starting exhibit away keeps the own pool')
assert.equal(resolved({ exhibits: [] }).mana.R, 2, 'but not its mana')
assert.deepEqual(resolved({ exhibits: ['ReimuR', 'MarisaB', 'Yuerang'] }).owners, ['Reimu', 'Marisa'])
assert.equal(resolved({ exhibits: ['Yuerang'] }).mana.C, 2, 'an exhibit can give two')
assert.ok(resolved({ exhibits: ['KongbaiKapai'] }).blank && !resolved().blank)
assert.deepEqual(resolved({ purify: 'R' }).mana, { W: 2, U: 0, B: 0, R: 2, G: 0, C: 2, P: 0 }, 'purify: one to two colourless')
assert.deepEqual(resolved({ refine: 'W' }).mana, { W: 1, U: 0, B: 0, R: 3, G: 0, C: 0, P: 1 }, 'refine: one to one philosophy')
assert.deepEqual(resolved({ purify: 'R', refine: 'C' }).mana, { W: 2, U: 0, B: 0, R: 2, G: 0, C: 1, P: 1 }, 'refine can use what purify made')
assert.deepEqual(resolved({ purify: 'U' }).mana, resolved().mana, 'nothing to convert: no change')
assert.deepEqual(startingPool(poolData, 'Reimu.B').mana, { W: 3, U: 0, B: 0, R: 2, G: 0, C: 0, P: 0 })
assert.equal(startingPool(poolData, null), null)
assert.deepEqual(shiningExhibits(poolData).map(r => r.key), ['W', 'B', 'R', 'C', 'P', 'random'], 'rows by colour, Mythic left out')
assert.deepEqual(shiningExhibits(poolData).at(-1).exhibits.map(e => e.id), ['Lianhua'])
const diffCards = [
  card('keep', 1, { pooled: true, poolCost: { R: 1 }, colors: ['R'] }),
  card('gain', 2, { pooled: true, poolCost: { B: 1 }, colors: ['B'] }),
  card('lose', 3, { pooled: true, poolCost: { R: 3 }, colors: ['R'] }),
]
const diffState = (poolDiff, over) => ({ ...decodeState(cards, ''), poolDiff, pool: { enabled: true, route: 'Reimu.A', exhibits: ['ReimuR', 'MarisaB'], purify: 'R', refine: null, ...over } })
const diffRun = state => applyCollection(cards, diffCards, state, { pool: resolvePool(poolData, state.pool), poolStart: startingPool(poolData, state.pool.route) }).map(r => r.id)
assert.deepEqual(diffRun(diffState(null)), ['keep', 'gain'], 'filter by the current pool')
assert.deepEqual(diffRun(diffState('added')), ['gain'], 'what the changes added')
assert.deepEqual(diffRun(diffState('removed')), ['lose'], 'what they removed')

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
Object.assign(filled.pool, { enabled: true, route: 'Marisa.B', exhibits: ['MarisaR', 'XianzheShi'], purify: 'R', refine: 'C' })
filled.poolDiff = 'removed'
assert.deepEqual(decodeState(cards, encodeState(cards, filled)), filled)
const unticked = decodeState(cards, '')
Object.assign(unticked.pool, { route: 'Reimu.A', exhibits: ['ReimuR'] })
assert.deepEqual(decodeState(cards, encodeState(cards, unticked)).pool, unticked.pool, 'choices survive with the filter unticked')
assert.equal(decodeState(cards, 'sort=nope').sort, 'default', 'unknown sort falls back')
assert.equal(decodeState(cards, encodeState(cards, { ...empty, roll: 'ZoufangSnake' })).roll, 'ZoufangSnake')
assert.equal(decodeState(cards, 'purify=Q').pool.purify, null, 'bad colour ignored')
assert.equal(decodeState(cards, 'purify=P').pool.purify, null, 'philosophy cannot be purified')
assert.equal(decodeState(cards, 'purify=C').pool.purify, null, 'nor colourless')
assert.equal(decodeState(cards, 'refine=P').pool.refine, null, 'philosophy cannot be refined')
assert.equal(decodeState(cards, 'pool=2.0.0.3.0.0.0').pool.enabled, false, 'old-style links are ignored')
assert.equal(poolLink(poolData.characters[0], 'B'), '#/cards?pool=1&poolRoute=Reimu.B&poolExhibit=ReimuW')
console.log('collections ok')
