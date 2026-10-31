// Tab key -> how its rows render. Pairs with config/collections.js. Characters have their own page.
import CardDetail from './CardDetail.vue'
import CardTile from './CardTile.vue'
import ExhibitDetail from './ExhibitDetail.vue'
import ExhibitTile from './ExhibitTile.vue'

export const ENTITY_COMPONENTS = {
  cards: { tile: CardTile, detail: CardDetail },
  exhibits: { tile: ExhibitTile, detail: ExhibitDetail },
}
