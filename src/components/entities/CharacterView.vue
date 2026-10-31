<template>
  <div class="character-view">
    <nav class="tabs" :aria-label="t('tab.characters')">
      <a
        v-for="c in data.characters" :key="c.id"
        class="tab" :class="{ active: c.id === character.id }"
        :aria-current="c.id === character.id ? 'page' : undefined"
        :href="`#/characters/${c.id}`"
      >
        <img class="avatar" :src="imgUrl('characters', c.avatar)" alt="" />
        <span class="tab-name">{{ c.shortName }}</span>
        <span class="tab-colors">
          <ManaIcon v-for="color in c.colors" :key="color" :symbol="color" :label="t(`mana.${color}`)" size="20px" />
        </span>
      </a>
    </nav>

    <div class="body">
      <section class="profile">
        <img v-if="character.stand" class="stand" :src="imgUrl('characters', character.stand)" :alt="character.name" />
        <div class="profile-text">
          <h2>{{ character.fullName }}</h2>
          <p class="title">{{ character.title }}</p>
          <dl class="stats">
            <div><dt>{{ t('char.hp') }}</dt><dd>{{ character.hp }}</dd></div>
            <div><dt>{{ t('char.money') }}</dt><dd>{{ character.money }}</dd></div>
            <div v-if="character.home" class="wide"><dt>{{ t('char.home') }}</dt><dd>{{ character.home }}</dd></div>
          </dl>
        </div>
      </section>
      <LoadoutSection
        v-for="(side, i) in ['A', 'B']"
        :key="`${character.id}-${side}`"
        :character="character"
        :loadout="character.loadouts[side]"
        :color="character.colors[i]"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { data, findEntity, imgUrl, route, t } from '../../store/codex.js'
import ManaIcon from '../shared/ManaIcon.vue'
import LoadoutSection from './LoadoutSection.vue'

const character = computed(() => findEntity('characters', route.id) ?? data.value.characters[0])
</script>

<style scoped>
.character-view { max-width: 1500px; margin: 0 auto; padding: 16px 20px 32px; }
.tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 16px; }
.tab {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--line); color: var(--text); text-decoration: none;
}
.tab:hover { background: var(--hover); }
.tab.active { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); background: var(--selected); }
.avatar { width: 44px; height: 44px; flex: none; border-radius: 50%; object-fit: cover; object-position: top; background: var(--surface-2); }
.tab-name { flex: 1; min-width: 0; font-weight: 600; font-size: 15px; }
.tab-colors { display: flex; gap: 2px; flex: none; }
.body { display: grid; grid-template-columns: 260px minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.profile { position: sticky; top: 0; }
.stand { display: block; width: 100%; max-height: 460px; object-fit: contain; }
h2 { margin: 8px 0 0; font-size: 20px; color: var(--accent); }
.title { margin: 2px 0 10px; color: var(--text-dim); font-size: 14px; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.stats .wide { grid-column: 1 / -1; }
dt { font-size: 12px; color: var(--text-dim); }
dd { margin: 2px 0 0; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.wide dd { font-size: 14px; font-weight: 500; }

@media (max-width: 1100px) {
  .body { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .profile { grid-column: 1 / -1; position: static; display: flex; gap: 16px; align-items: center; }
  .stand { width: 140px; max-height: 220px; }
  .profile-text { flex: 1; min-width: 0; }
}
@media (max-width: 720px) {
  .character-view { padding: 12px 12px 24px; }
  .body { grid-template-columns: minmax(0, 1fr); }
  .tabs { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; }
  .tab { padding: 6px 8px; gap: 6px; flex-wrap: wrap; }
  .avatar { width: 32px; height: 32px; }
}
</style>
