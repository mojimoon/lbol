// Shared state as a plain module store: components import what they use.
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { COLLECTIONS, applyCollection, decodeState, encodeState } from '../config/collections.js'

const BASE = import.meta.env.BASE_URL

const lsGet = (key, fallback) => {
  try {
    const value = localStorage.getItem(`lbol_${key}`)
    return value === null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}
const lsSet = (key, value) => {
  try { localStorage.setItem(`lbol_${key}`, JSON.stringify(value)) } catch { /* private window */ }
}

// ---- data + i18n ----
export const data = shallowRef(null)
export const loadError = ref(false)
export const languages = ref([])
export const lang = ref(lsGet('lang', null))

export function t(key, params) {
  const text = data.value?.ui?.[key] ?? key
  return params ? text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : text
}

export const imgUrl = (dir, stem) => (stem ? `${BASE}img/${dir}/${encodeURIComponent(stem)}.webp` : '')

const pickLanguage = (list, fallback) => {
  const codes = list.map(l => l.code)
  if (codes.includes(lang.value)) return lang.value
  const nav = (navigator.language || '').toLowerCase()
  return codes.find(c => c.toLowerCase() === nav) ?? codes.find(c => c.split('-')[0] === nav.split('-')[0]) ?? fallback
}

async function loadLanguage(code) {
  const res = await fetch(`${BASE}data/lbol.${code}.json`)
  if (!res.ok) throw new Error(`${res.status}`)
  data.value = await res.json()
  document.documentElement.lang = code
  document.title = t('app.title')
}

export async function initCodex() {
  try {
    const res = await fetch(`${BASE}data/languages.json`)
    if (!res.ok) throw new Error(`${res.status}`)
    const meta = await res.json()
    languages.value = meta.languages
    lang.value = pickLanguage(meta.languages, meta.default)
    await loadLanguage(lang.value)
  } catch (err) {
    console.error(err)
    loadError.value = true
  }
}

watch(lang, (code, previous) => {
  lsSet('lang', code)
  if (previous && code) loadLanguage(code).catch(() => { loadError.value = true })
})

// ---- preferences ----
export const isDark = ref(lsGet('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true))
watch(isDark, dark => {
  lsSet('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}, { immediate: true })

export const upgraded = ref(lsGet('upgraded', false))
watch(upgraded, v => lsSet('upgraded', v))

export const showOwnerAvatar = ref(lsGet('showOwnerAvatar', true))
watch(showOwnerAvatar, v => lsSet('showOwnerAvatar', v))

// ---- route: #/<tab>[/<id>][?<filters>] ----
const parseHash = () => {
  const [path, query = ''] = location.hash.split('?')
  const [, tab, id] = path.split('/').map(decodeURIComponent)
  return { tab: COLLECTIONS.some(c => c.key === tab) ? tab : COLLECTIONS[0].key, id: id || null, query }
}
const parsed = parseHash()
export const route = reactive({ tab: parsed.tab, id: parsed.id })

export function navigate(tab, id = null) {
  location.hash = id ? `#/${tab}/${encodeURIComponent(id)}` : `#/${tab}`
}

// ---- browsing ----
export const collection = computed(() => COLLECTIONS.find(c => c.key === route.tab))

// Each tab keeps its own search, facets and sort while switching between tabs.
export const browseState = reactive(Object.fromEntries(COLLECTIONS.map(c => [c.key, {
  search: '',
  sort: c.sorts[0]?.key ?? null,
  descending: false,
  facets: Object.fromEntries(c.facets.map(f => [f.key, []])),
  ...c.initialState?.(),
}])))
export const currentState = computed(() => browseState[route.tab])

// A URL with filters sets them; a fresh link without any (a tab or tile link) keeps what the tab
// already has. Entries we have written carry a marker, so going back to one restores exactly what
// it shows, even "no filters". The address bar always shows the current filters, so any view can
// be shared.
const applyHash = ({ tab, id, query }) => {
  Object.assign(route, { tab, id })
  if (query || history.state?.lbol) Object.assign(browseState[tab], decodeState(collection.value, query))
}
function syncUrl() {
  const query = encodeState(collection.value, currentState.value)
  const path = `#/${route.tab}${route.id ? `/${encodeURIComponent(route.id)}` : ''}`
  const target = query ? `${path}?${query}` : path
  if (location.hash !== target || !history.state?.lbol) history.replaceState({ lbol: true }, '', target)
}
applyHash(parsed)
window.addEventListener('hashchange', () => {
  applyHash(parseHash())
  syncUrl()
})
watch(() => encodeState(collection.value, currentState.value), syncUrl)
syncUrl()

export const results = computed(() => {
  if (!data.value) return []
  const state = currentState.value
  const rollSpec = state.roll ? findEntity('cards', state.roll)?.roll : null
  return applyCollection(collection.value, data.value[route.tab], state, { upgraded: upgraded.value, lang: data.value.lang, rollSpec })
})

export const isFiltered = computed(() => {
  const state = currentState.value
  return state.search.trim() !== '' || Object.values(state.facets).some(v => v.length > 0) || !!state.pool?.enabled || !!state.roll
})

// ---- "cards this card can create" ----
// The filters and open card to go back to. Lost on reload; the browser's Back button still works.
export const rollReturn = ref(null)

export function jumpToRoll(cardId) {
  rollReturn.value = { tab: route.tab, id: route.id, query: encodeState(collection.value, currentState.value) }
  location.hash = `#/cards/${encodeURIComponent(cardId)}?roll=${encodeURIComponent(cardId)}`
}

export function returnFromRoll() {
  const { tab, id, query } = rollReturn.value
  rollReturn.value = null
  Object.assign(browseState[tab], decodeState(COLLECTIONS.find(c => c.key === tab), query))
  navigate(tab, id)
}

export function clearRoll() {
  rollReturn.value = null
  currentState.value.roll = null
}

export function resetFilters() {
  rollReturn.value = null
  const state = currentState.value
  state.search = ''
  for (const key of Object.keys(state.facets)) state.facets[key] = []
  const fresh = collection.value.initialState?.()
  if (fresh) Object.assign(state, fresh)
}

export function toggleFacet(key, value) {
  const list = currentState.value.facets[key]
  const i = list.indexOf(value)
  if (i >= 0) list.splice(i, 1)
  else list.push(value)
}

const entityIndex = computed(() => {
  const index = {}
  for (const c of COLLECTIONS) index[c.key] = new Map((data.value?.[c.key] ?? []).map(row => [row.id, row]))
  return index
})
export const findEntity = (tab, id) => entityIndex.value[tab]?.get(id) ?? null
export const selected = computed(() => (route.id ? findEntity(route.tab, route.id) : null))

/** Rows for a list of ids, skipping any left out of the codex. */
export const existing = (tab, ids) => (ids ?? []).map(id => findEntity(tab, id)).filter(Boolean)

export const ownerName = owner => findEntity('characters', owner)?.shortName ?? t('owner.Neutral')

// ---- term tooltip ----
export const tip = ref(null)
export function showTip(termRef, el) {
  const box = el.getBoundingClientRect()
  tip.value = { ref: termRef, left: box.left, top: box.top, bottom: box.bottom }
}
export const hideTip = () => { tip.value = null }
// The hovered term may disappear on navigation without ever firing mouseleave.
watch(() => [route.tab, route.id], hideTip)

/** Resolve a term ref (k:Block, s:Weak, c:Id, e:Id) to tooltip content. */
export function resolveTerm(termRef) {
  const [kind, id] = [termRef.slice(0, 1), termRef.slice(2)]
  if (kind === 'c' || kind === 'e') {
    const tab = kind === 'c' ? 'cards' : 'exhibits'
    const row = findEntity(tab, id)
    if (!row) return null
    return { name: row.name, desc: kind === 'c' ? row.base.desc : row.desc, tab, id }
  }
  return data.value?.terms?.[termRef] ?? null
}
