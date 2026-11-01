// What each tab browses: its data key, facets and sort orders. Pure data and functions
// (no Vue), so filter logic can be tested with plain node. To add a tab: add an entry
// here, a tile + detail component in entities/registry.js, and a `tab.<key>` UI string.

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Shining', 'Mythic']
const CARD_TYPES = ['Attack', 'Defense', 'Skill', 'Ability', 'Friend', 'Tool', 'Status', 'Misfortune']
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C', 'P']
const COSTS = ['0', '1', '2', '3', '4', '5+', 'X']
const SINGLE_COLORS = ['W', 'U', 'B', 'R', 'G', 'C']
// ManaGroup.HybridColors, indexed by HybridColor.
const HYBRID_PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG']

export const cardFace = (card, upgraded) => (upgraded && card.up) || card.base

/**
 * Mirrors MuseumPanel.FilterCardByMana.
 * With P ("multicolour") selected: multicolour cards containing every other selected colour.
 * Without it: any selected colour matches; C also matches cards with no colour at all.
 */
export function matchesColors(colors, selected) {
  if (selected.length === 0) return true
  const overlap = colors.filter(c => selected.includes(c)).length
  if (selected.includes('P')) return colors.length > 1 && overlap >= selected.length - 1
  if (selected.includes('C') && colors.length === 0) return true
  return overlap >= 1
}

/** Mirrors ManaGroup.CanAfford. `mana` is available mana; `cost` a card's raw cost (absent fields are 0). */
export function canAfford(mana, cost) {
  const left = c => (mana[c] ?? 0) - (cost[c] ?? 0)
  const hybrid = cost.Hybrid ?? 0
  const remaining = [...SINGLE_COLORS, 'P'].reduce((sum, c) => sum + left(c), 0) - hybrid
  if (remaining < (cost.Any ?? 0)) return false
  let philosophy = left('P')
  for (const c of SINGLE_COLORS) if (left(c) < 0) philosophy += left(c)
  if (hybrid > 0) {
    const [a, b] = HYBRID_PAIRS[cost.HybridColor ?? 0]
    const short = Math.max(0, left(a)) + Math.max(0, left(b)) - hybrid
    if (short < 0) philosophy += short
  }
  return philosophy >= 0
}

/**
 * Mirrors GameRunController's card roll with OwnerWeightTable.Valid: card rewards and shops.
 * pool: { mana: {W, U, B, R, G, C, P}, owners: [character ids], blank: holds the Blank Card exhibit }
 * Tools are left out: only shops sell them, and any character can buy them, so they tell nothing here.
 */
const costAmount = cost => ['Any', ...SINGLE_COLORS, 'P', 'Hybrid'].reduce((sum, k) => sum + (cost[k] ?? 0), 0)

export function inCardPool(card, pool) {
  if (!card.pooled || card.type === 'Tool') return false
  if (card.owner && !pool.owners.includes(card.owner)) return false
  const cost = card.poolCost
  // Above 5 total, the generic part does not limit the pool.
  if (!canAfford(pool.mana, costAmount(cost) > 5 ? { ...cost, Any: 0 } : cost)) return false
  return pool.blank || card.colors.every(c => (pool.mana[c] ?? 0) > 0)
}

/**
 * Can a card with this roll spec (pipeline/random_pools.py) create `card`? Mirrors
 * GameRunController.CreateValidCardsPool with battleRolling on, and CardWeightTable.WeightFor,
 * whose default includeOutsideKeyword rules out Gadgets cards. Base mana and held exhibits
 * are not known here; the pool filter can narrow those down separately.
 */
export function inRoll(card, spec) {
  if (!card.pooled || !card.findInBattle || card.gadget) return false
  if (!spec.types.includes(card.type) || !spec.rarities.includes(card.rarity)) return false
  if (spec.neutral_only && card.owner) return false
  if (spec.exclude?.includes(card.id)) return false
  const amount = costAmount(card.poolCost)
  if (amount < (spec.cost_min ?? 0) || amount > (spec.cost_max ?? Infinity)) return false
  if (spec.color_count != null && card.colors.length !== spec.color_count) return false
  if (spec.colors_within && !(card.colors.length > 0 && card.colors.every(c => spec.colors_within.includes(c)))) return false
  return true
}

export function costBucket(face) {
  if (face.isX) return 'X'
  return face.total >= 5 ? '5+' : String(face.total)
}

const presentIn = (order, values) => {
  const present = new Set(values)
  return order.filter(v => present.has(v))
}

const ownerOptions = (data, t) => [
  ...data.characters.map(c => ({ value: c.id, label: c.shortName, avatar: c.avatar })),
  { value: 'Neutral', label: t('owner.Neutral') },
]

const rarityOptions = (rows, data) =>
  presentIn(RARITIES, rows.map(r => r.rarity)).map(v => ({ value: v, label: data.enums.Rarity[v] ?? v }))

const byIndex = (a, b) => a.index - b.index
const byRarity = (a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.index - b.index

export const COLLECTIONS = [
  {
    key: 'cards',
    gridClass: 'grid-cards',
    tileAspect: 740 / 530,  // every tile this shape: EntityGrid renders only those near the screen
    upgradeToggle: true,
    poolBefore: 'keyword',  // PoolFilter sits just above this facet
    initialState: () => ({ roll: null, pool: { enabled: false, mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, P: 0 }, owners: [], blank: false } }),
    extraFilter: (card, state, ctx) => (!state.pool.enabled || inCardPool(card, state.pool)) && (!ctx.rollSpec || inRoll(card, ctx.rollSpec)),
    // Same as the in-game museum: HideMesuem cards are reachable by link but not listed.
    listed: card => !card.hidden,
    facets: [
      { key: 'owner', label: 'filter.owner', options: ownerOptions, values: c => [c.owner ?? 'Neutral'] },
      {
        key: 'type', label: 'filter.type',
        options: data => presentIn(CARD_TYPES, data.cards.filter(c => !c.hidden).map(c => c.type))
          .map(v => ({ value: v, label: data.enums.CardType[v] ?? v, icon: `type_${v.toLowerCase()}` })),
        values: c => [c.type],
      },
      {
        key: 'cost', label: 'filter.cost',
        options: () => COSTS.map(v => ({ value: v, label: v })),
        values: (c, ctx) => [costBucket(cardFace(c, ctx.upgraded))],
      },
      {
        key: 'rarity', label: 'filter.rarity',
        options: data => rarityOptions(data.cards.filter(c => !c.hidden), data),
        values: c => [c.rarity],
      },
      {
        key: 'color', label: 'filter.color', hint: 'filter.colorHint',
        options: (_, t) => COLORS.map(v => ({ value: v, label: t(`mana.${v}`), mana: v })),
        match: (c, selected) => matchesColors(c.colors, selected),
      },
      {
        key: 'cardPool', label: 'filter.cardPool',
        options: (_, t) => ['in', 'out'].map(v => ({ value: v, label: t(`cardPool.${v}`) })),
        values: c => [c.pooled ? 'in' : 'out'],
      },
      {
        key: 'special', label: 'filter.special',
        options: (_, t) => ['multi', 'discover', 'power'].map(v => ({ value: v, label: t(`special.${v}`) })),
        values: c => c.special,
      },
      {
        key: 'keyword', label: 'filter.keyword', collapsible: true,
        options: data => {
          const used = new Set(data.cards.filter(c => !c.hidden).flatMap(c => [...c.base.keywords, ...(c.up?.keywords ?? [])]))
          return [...used].map(k => ({ value: k, label: data.terms[`k:${k}`]?.name ?? k }))
            .sort((a, b) => a.label.localeCompare(b.label, data.lang))
        },
        values: (c, ctx) => cardFace(c, ctx.upgraded).keywords,
      },
      {
        // Status effects: the same list as the game's card tooltips, plus any named in the text.
        key: 'mechanic', label: 'filter.mechanic', collapsible: true,
        options: data => {
          const used = new Set(data.cards.filter(c => !c.hidden).flatMap(c => [...c.base.effects, ...(c.up?.effects ?? [])]))
          return [...used].filter(e => data.terms[`s:${e}`]).map(e => ({ value: e, label: data.terms[`s:${e}`].name }))
            .sort((a, b) => a.label.localeCompare(b.label, data.lang))
        },
        values: (c, ctx) => cardFace(c, ctx.upgraded).effects,
      },
      {
        key: 'illustrator', label: 'filter.illustrator', collapsible: true,
        options: data => {
          const names = new Set(data.cards.filter(c => !c.hidden).flatMap(c => [c.illustrator, ...c.alts.map(a => a.ill)]))
          names.delete(null)
          return [...names].sort((a, b) => a.localeCompare(b, data.lang)).map(v => ({ value: v, label: v }))
        },
        // A card also counts for the illustrators of its alternate art.
        values: c => [c.illustrator, ...c.alts.map(a => a.ill)],
      },
    ],
    sorts: [
      { key: 'default', label: 'sort.default', compare: byIndex },
      {
        // MuseumPanel.SortCards: forbidden and X-cost cards after everything else.
        key: 'cost', label: 'sort.cost',
        compare: (a, b, ctx) => {
          const [fa, fb] = [cardFace(a, ctx.upgraded), cardFace(b, ctx.upgraded)]
          return fa.forbidden - fb.forbidden
            || fa.isX - fb.isX || fa.total - fb.total || a.index - b.index
        },
      },
      { key: 'rarity', label: 'sort.rarity', compare: byRarity },
      {
        // MuseumPanel.SortCards: illustrator, then index. No illustrator sorts first.
        key: 'illustrator', label: 'sort.illustrator',
        compare: (a, b, ctx) => (a.illustrator ?? '').localeCompare(b.illustrator ?? '', ctx.lang) || a.index - b.index,
      },
    ],
  },
  {
    key: 'exhibits',
    gridClass: 'grid-exhibits',
    facets: [
      { key: 'owner', label: 'filter.owner', options: ownerOptions, values: e => [e.owner ?? 'Neutral'] },
      {
        // Museum grouping (Index / 100), not the same thing as rarity: a shop or event exhibit also has a rarity.
        key: 'exhibitType', label: 'filter.exhibitType',
        options: data => Object.entries(data.enums.ExhibitType)
          .filter(([v]) => data.exhibits.some(e => e.exhibitType === v))
          .map(([value, label]) => ({ value, label })),
        values: e => [e.exhibitType],
      },
      { key: 'rarity', label: 'filter.rarity', options: data => rarityOptions(data.exhibits, data), values: e => [e.rarity] },
      {
        key: 'baseMana', label: 'filter.baseMana',
        options: (data, t) => presentIn(COLORS, data.exhibits.map(e => e.baseMana))
          .map(v => ({ value: v, label: t(`mana.${v}`), mana: v })),
        values: e => (e.baseMana ? [e.baseMana] : []),
      },
    ],
    sorts: [
      { key: 'default', label: 'sort.default', compare: byIndex },
      { key: 'rarity', label: 'sort.rarity', compare: byRarity },
    ],
  },
  {
    key: 'characters',
    gridClass: 'grid-characters',
    facets: [],
    sorts: [],
  },
]

const POOL_COLORS = ['W', 'U', 'B', 'R', 'G', 'C', 'P']

/**
 * Browsing state <-> URL query. Facets repeat their key (owner=Reimu&owner=Neutral), so
 * values may contain anything. Defaults are left out to keep links short.
 */
export function encodeState(collection, state) {
  const params = new URLSearchParams()
  if (state.search.trim()) params.set('q', state.search.trim())
  if (state.sort && state.sort !== collection.sorts[0]?.key) params.set('sort', state.sort)
  if (state.descending) params.set('desc', '1')
  for (const facet of collection.facets) {
    for (const value of state.facets[facet.key] ?? []) params.append(facet.key, value)
  }
  if (state.roll) params.set('roll', state.roll)
  if (state.pool?.enabled) {
    params.set('pool', POOL_COLORS.map(c => state.pool.mana[c]).join('.'))
    for (const owner of state.pool.owners) params.append('poolOwner', owner)
    if (state.pool.blank) params.set('blank', '1')
  }
  return params.toString()
}

export function decodeState(collection, query) {
  const params = new URLSearchParams(query)
  const sort = params.get('sort')
  const state = {
    search: params.get('q') ?? '',
    sort: collection.sorts.some(s => s.key === sort) ? sort : collection.sorts[0]?.key ?? null,
    descending: params.get('desc') === '1',
    facets: Object.fromEntries(collection.facets.map(f => [f.key, params.getAll(f.key)])),
    ...collection.initialState?.(),
  }
  if (params.has('roll') && state.pool) state.roll = params.get('roll')
  if (state.pool && params.has('pool')) {
    const counts = params.get('pool').split('.')
    state.pool.enabled = true
    POOL_COLORS.forEach((c, i) => { state.pool.mana[c] = Math.max(0, Number.parseInt(counts[i], 10) || 0) })
    state.pool.owners = params.getAll('poolOwner')
    state.pool.blank = params.get('blank') === '1'
  }
  return state
}

/** Link to the card list, filtered to what one character route can find. */
export function poolLink(character, loadout) {
  const cards = COLLECTIONS.find(c => c.key === 'cards')
  const state = decodeState(cards, '')
  state.pool.enabled = true
  state.pool.owners = [character.id]
  for (const symbol of loadout.mana) state.pool.mana[symbol] += 1
  return `#/cards?${encodeState(cards, state)}`
}

/** Apply search, facets (OR within a facet, AND across facets) and sort. */
export function applyCollection(collection, rows, state, ctx) {
  const terms = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const out = rows.filter(row => {
    if (collection.listed && !collection.listed(row)) return false
    if (collection.extraFilter && !collection.extraFilter(row, state, ctx)) return false
    if (terms.length && !terms.every(q => (row.search ?? row.name.toLowerCase()).includes(q))) return false
    return collection.facets.every(facet => {
      const selected = state.facets[facet.key] ?? []
      if (selected.length === 0) return true
      if (facet.match) return facet.match(row, selected, ctx)
      return facet.values(row, ctx).some(v => selected.includes(v))
    })
  })
  const sort = collection.sorts.find(s => s.key === state.sort) ?? collection.sorts[0]
  if (sort) {
    out.sort((a, b) => sort.compare(a, b, ctx))
    if (state.descending) out.reverse()
  }
  return out
}
