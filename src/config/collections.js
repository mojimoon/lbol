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

export const MANA_ORDER = COLORS
export const BLANK_CARD = 'KongbaiKapai'
// JunkoColorless and PatchouliPhilosophy, the only events that change base mana. Their selection
// zeroes these out of what can be picked: colourless and philosophy for one, philosophy for the other.
export const PURIFY_FROM = ['W', 'U', 'B', 'R', 'G']
export const REFINE_FROM = ['W', 'U', 'B', 'R', 'G', 'C']

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
 * Where a card can come from. Rewards use CardTypeWeightTable.CanBeLoot (no tools) and leave out
 * Gadgets cards (CardWeightTable.WeightFor); shops have their own slots for both.
 */
export const poolKind = card => (!card.pooled ? 'out' : card.type === 'Tool' || card.gadget ? 'shop' : 'in')

const costAmount = cost => ['Any', ...SINGLE_COLORS, 'P', 'Hybrid'].reduce((sum, k) => sum + (cost[k] ?? 0), 0)

/**
 * Mirrors GameRunController's card roll for rewards and shops. Shop tools are left out: any character
 * can buy them, so they tell nothing here. Gadgets cards stay in for their shop odds.
 * pool: { mana: {W, U, B, R, G, C, P}, owners: [character ids], blank: holds the Blank Card exhibit }
 */
export function inCardPool(card, pool) {
  if (!card.pooled || card.type === 'Tool') return false
  if (card.owner && !pool.owners.includes(card.owner)) return false
  const cost = card.poolCost
  // Above 5 total, the generic part does not limit the pool.
  if (!canAfford(pool.mana, costAmount(cost) > 5 ? { ...cost, Any: 0 } : cost)) return false
  return pool.blank || card.colors.every(c => (pool.mana[c] ?? 0) > 0)
}

// GameRunController.BaseCardWeight and the stage weight tables, see docs/card-reward-weights.md.
const RARE_FACTOR = 0.85  // Where the factor starts. It drifts during a run, which a codex cannot know.
const TRIVIAL_COLORS = ['W', 'U', 'B', 'R', 'G']
const COST_FACTOR = { 1: [0.9, 0.9, 1, 1.1, 1.2], 2: [0.9, 1, 1.1] }
const RARITY_WEIGHT = {
  normal: { Common: 1, Uncommon: 0.5, Rare: 0.05 },
  elite: { Common: 1, Uncommon: 0.8, Rare: 0.15 },
  shop: { Common: 1, Uncommon: 0.7, Rare: 0.15 },
}
// Player, other character with a held exhibit, neutral: reward slots 1, 2, 3 and 4+. Shops use the last.
const SLOT_OWNER_WEIGHT = [[1, 0, 0], [0.2, 0.8, 0], [0, 0, 1], [1, 0.8, 0.7]]
const SHOP_OWNER_WEIGHT = SLOT_OWNER_WEIGHT[3]
const LOOT_TYPES = ['Attack', 'Defense', 'Skill', 'Ability', 'Friend']
const SHOP_FRIEND_WEIGHT = 5
const SHOP_GADGET_WEIGHT = 2

export const percent = chance => (chance * 100).toFixed(1)

function costFactor(card) {
  const pips = TRIVIAL_COLORS.map(c => card.poolCost[c] ?? 0)
  const kinds = Math.max(card.colors.length, pips.filter(Boolean).length)
  if (kinds === 0) return 0.9
  return kinds >= 3 ? 1.3 : COST_FACTOR[kinds][Math.max(...pips)]
}

function colorFactor(card, mana) {
  if (!card.colors.length) return 0.8
  const total = Object.values(mana).reduce((sum, n) => sum + n, 0)
  return Math.max(0.8, card.colors.reduce((f, c) => f + ((mana[c] ?? 0) / total - 0.5) * 0.8, 1))
}

/**
 * The chance a card turns up in two draws without replacement, where the second may also hold cards
 * the first cannot. Cards in both weigh the same in both. Gives Map(entry -> chance) over `second`.
 */
function drawTwice(first, second) {
  const total = list => list.reduce((sum, e) => sum + e.shop.w, 0)
  const [t1, t2] = [total(first), total(second)]
  return new Map(second.map(e => {
    let chance = first.includes(e) ? e.shop.w / t1 : 0
    for (const f of first) if (f !== e) chance += (f.shop.w / t1) * (e.shop.w / (t2 - f.shop.w))
    return [e, chance]
  }))
}

/**
 * Per card in the pool, Map(id -> odds): the chance and weight in each reward slot of a normal and an
 * elite battle, one draw at a time, and in a shop, the chance one shop offers the card at all.
 * Null without a character, whose cards the slots are defined by.
 */
export function poolOdds(cards, pool) {
  if (!pool.player) return null
  const entries = cards.filter(card => inCardPool(card, pool)).map(card => {
    const [cost, color] = [costFactor(card), colorFactor(card, pool.mana)]
    const owner = !card.owner ? 2 : card.owner === pool.player ? 0 : 1
    const rare = card.rarity === 'Rare' ? RARE_FACTOR : 1
    const rarity = Object.fromEntries(Object.entries(RARITY_WEIGHT).map(([k, table]) => [k, table[card.rarity] ?? 0]))
    const loot = !card.gadget && LOOT_TYPES.includes(card.type)
    const slots = kind => SLOT_OWNER_WEIGHT.map(row => ({ p: 0, w: loot ? rarity[kind] * row[owner] * cost * color * rare : 0 }))
    const bonus = (card.gadget ? SHOP_GADGET_WEIGHT : 1) * (card.type === 'Friend' ? SHOP_FRIEND_WEIGHT : 1)
    return {
      card, cost, color, rarity,
      normal: slots('normal'),
      elite: slots('elite'),
      shop: { p: 0, w: rarity.shop * SHOP_OWNER_WEIGHT[owner] * bonus * cost * color * rare },
    }
  })
  for (const kind of ['normal', 'elite']) {
    for (let slot = 0; slot < SLOT_OWNER_WEIGHT.length; slot++) {
      const total = entries.reduce((sum, e) => sum + e[kind][slot].w, 0)
      for (const e of entries) e[kind][slot].p = total ? e[kind][slot].w / total : 0
    }
  }
  // Stage.GetShopNormalCards: two each of attack, defense and ability; one skill; one skill or friend.
  const ofType = (...types) => entries.filter(e => types.includes(e.card.type))
  const draws = ['Attack', 'Defense', 'Ability'].map(type => drawTwice(ofType(type), ofType(type)))
  draws.push(drawTwice(ofType('Skill'), ofType('Skill', 'Friend')))
  for (const draw of draws) for (const [e, chance] of draw) e.shop.p = chance
  return new Map(entries.map(e => [e.card.id, e]))
}

/**
 * What share of the cards a shop offers falls under each option of a facet. Shop odds rather than
 * card counts: most of a pool's rares rarely turn up, and rewards fix the owners slot by slot.
 */
export function oddsShares(facet, values, odds, ctx) {
  const entries = [...odds.values()]
  const total = entries.reduce((sum, e) => sum + e.shop.p, 0)
  const has = (card, value) => (facet.oddsValues ?? facet.values)(card, ctx).includes(value)
  return Object.fromEntries(values.map(value => [
    value,
    entries.reduce((sum, e) => sum + (has(e.card, value) ? e.shop.p : 0), 0) / total,
  ]))
}

/** Shining exhibits by the mana they give, one row per colour; those with none are "random" (per turn). */
export function shiningExhibits(data) {
  const shining = data.exhibits.filter(e => e.rarity === 'Shining')
  return [...COLORS, 'random']
    .map(key => ({ key, exhibits: shining.filter(e => (e.baseMana ?? 'random') === key) }))
    .filter(row => row.exhibits.length)
}

/**
 * What the reward pool inputs add up to, for inCardPool. pool.route is 'Reimu.A': the character sets
 * the 2 + 2 base mana and its own pool; the route only says which exhibit it starts with, which can
 * be traded away. pool: { route, exhibits: [ids], purify: colour, refine: colour }
 */
export function resolvePool(data, pool) {
  const mana = Object.fromEntries(COLORS.map(c => [c, 0]))
  const owners = new Set()
  const character = data.characters.find(c => c.id === pool.route?.split('.')[0])
  if (character) {
    owners.add(character.id)
    for (const c of character.colors) mana[c] += 2
  }
  for (const id of pool.exhibits) {
    const exhibit = data.exhibits.find(e => e.id === id)
    if (!exhibit) continue
    if (exhibit.owner) owners.add(exhibit.owner)
    if (exhibit.baseMana) mana[exhibit.baseMana] += exhibit.baseManaAmount
  }
  const beforeEvents = { ...mana }
  if (mana[pool.purify] > 0) {
    mana[pool.purify] -= 1
    mana.C += 2
  }
  const afterPurify = { ...mana }
  if (mana[pool.refine] > 0) {
    mana[pool.refine] -= 1
    mana.P += 1
  }
  return { mana, player: character?.id ?? null, owners: [...owners], blank: pool.exhibits.includes(BLANK_CARD), beforeEvents, afterPurify }
}

/** The pool a route starts a run with, or null without a route. */
export function startingPool(data, route) {
  const [id, side] = route?.split('.') ?? []
  const exhibit = data.characters.find(c => c.id === id)?.loadouts[side]?.exhibit
  return exhibit ? resolvePool(data, { route, exhibits: [exhibit], purify: null, refine: null }) : null
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
    initialState: () => ({ roll: null, poolDiff: null, pool: { enabled: false, odds: false, route: null, exhibits: [], purify: null, refine: null } }),
    extraFilter: (card, state, ctx) => {
      if (ctx.rollSpec && !inRoll(card, ctx.rollSpec)) return false
      if (state.poolDiff && ctx.poolStart) {
        const [now, start] = [inCardPool(card, ctx.pool), inCardPool(card, ctx.poolStart)]
        return state.poolDiff === 'added' ? now && !start : start && !now
      }
      return !state.pool.enabled || inCardPool(card, ctx.pool)
    },
    // Same as the in-game museum: HideMesuem cards are reachable by link but not listed.
    listed: card => !card.hidden,
    facets: [
      { key: 'owner', label: 'filter.owner', oddsShare: true, options: ownerOptions, values: c => [c.owner ?? 'Neutral'] },
      {
        key: 'type', label: 'filter.type', oddsShare: true,
        options: data => presentIn(CARD_TYPES, data.cards.filter(c => !c.hidden).map(c => c.type))
          .map(v => ({ value: v, label: data.enums.CardType[v] ?? v, icon: `type_${v.toLowerCase()}` })),
        values: c => [c.type],
      },
      {
        key: 'cost', label: 'filter.cost', oddsShare: true,
        options: () => COSTS.map(v => ({ value: v, label: v })),
        values: (c, ctx) => [costBucket(cardFace(c, ctx.upgraded))],
      },
      {
        key: 'rarity', label: 'filter.rarity', oddsShare: true,
        options: data => rarityOptions(data.cards.filter(c => !c.hidden), data),
        values: c => [c.rarity],
      },
      {
        key: 'color', label: 'filter.color', hint: 'filter.colorHint', oddsShare: true,
        options: (_, t) => COLORS.map(v => ({ value: v, label: t(`mana.${v}`), mana: v })),
        match: (c, selected) => matchesColors(c.colors, selected),
        // Unlike the filter, each card counts once, so the shares add up to 100%.
        oddsValues: c => [c.colors.length > 1 ? 'P' : c.colors[0] ?? 'C'],
      },
      {
        key: 'cardPool', label: 'filter.cardPool',
        options: (_, t) => ['in', 'shop', 'out'].map(v => ({ value: v, label: t(`cardPool.${v}`) })),
        values: c => [poolKind(c)],
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
  if (state.poolDiff) params.set('poolDiff', state.poolDiff)
  if (state.pool) {
    if (state.pool.enabled) params.set('pool', '1')
    if (state.pool.odds) params.set('odds', '1')
    if (state.pool.route) params.set('poolRoute', state.pool.route)
    for (const id of state.pool.exhibits) params.append('poolExhibit', id)
    if (state.pool.purify) params.set('purify', state.pool.purify)
    if (state.pool.refine) params.set('refine', state.pool.refine)
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
  if (state.pool) {
    if (['added', 'removed'].includes(params.get('poolDiff'))) state.poolDiff = params.get('poolDiff')
    state.pool.enabled = params.get('pool') === '1'
    state.pool.odds = params.get('odds') === '1'
    state.pool.route = params.get('poolRoute')
    state.pool.exhibits = params.getAll('poolExhibit')
    if (PURIFY_FROM.includes(params.get('purify'))) state.pool.purify = params.get('purify')
    if (REFINE_FROM.includes(params.get('refine'))) state.pool.refine = params.get('refine')
  }
  return state
}

/** Link to the card list, filtered to what one character route starts a run with. */
export function poolLink(character, side) {
  const cards = COLLECTIONS.find(c => c.key === 'cards')
  const state = decodeState(cards, '')
  state.pool.enabled = true
  state.pool.route = `${character.id}.${side}`
  state.pool.exhibits = [character.loadouts[side].exhibit]
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
