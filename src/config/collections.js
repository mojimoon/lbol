// What each tab browses: its data key, facets and sort orders. Pure data and functions
// (no Vue), so filter logic can be tested with plain node. To add a tab: add an entry
// here, a tile + detail component in entities/registry.js, and a `tab.<key>` UI string.

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Shining', 'Mythic']
const CARD_TYPES = ['Attack', 'Defense', 'Skill', 'Ability', 'Friend', 'Tool', 'Status', 'Misfortune']
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C', 'P']
const COSTS = ['0', '1', '2', '3', '4', '5+', 'X']

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
    upgradeToggle: true,
    // Same as the in-game museum: HideMesuem cards are reachable by link but not listed.
    listed: card => !card.hidden,
    facets: [
      { key: 'owner', label: 'filter.owner', options: ownerOptions, values: c => [c.owner ?? 'Neutral'] },
      {
        key: 'type', label: 'filter.type',
        options: data => presentIn(CARD_TYPES, data.cards.filter(c => !c.hidden).map(c => c.type))
          .map(v => ({ value: v, label: data.enums.CardType[v] ?? v })),
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
        key: 'keyword', label: 'filter.keyword', collapsible: true,
        options: data => {
          const used = new Set(data.cards.filter(c => !c.hidden).flatMap(c => [...c.base.keywords, ...(c.up?.keywords ?? [])]))
          return [...used].map(k => ({ value: k, label: data.terms[`k:${k}`]?.name ?? k }))
            .sort((a, b) => a.label.localeCompare(b.label, data.lang))
        },
        values: (c, ctx) => cardFace(c, ctx.upgraded).keywords,
      },
    ],
    sorts: [
      { key: 'default', label: 'sort.default', compare: byIndex },
      {
        // MuseumPanel.SortCards: forbidden and X-cost cards after everything else.
        key: 'cost', label: 'sort.cost',
        compare: (a, b, ctx) => {
          const [fa, fb] = [cardFace(a, ctx.upgraded), cardFace(b, ctx.upgraded)]
          return fa.keywords.includes('Forbidden') - fb.keywords.includes('Forbidden')
            || fa.isX - fb.isX || fa.total - fb.total || a.index - b.index
        },
      },
      { key: 'rarity', label: 'sort.rarity', compare: byRarity },
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

/** Apply search, facets (OR within a facet, AND across facets) and sort. */
export function applyCollection(collection, rows, state, ctx) {
  const terms = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const out = rows.filter(row => {
    if (collection.listed && !collection.listed(row)) return false
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
