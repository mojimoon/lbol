<template>
  <header class="app-header">
    <a class="brand" href="#/cards">{{ t('app.title') }}</a>
    <nav class="tabs" :aria-label="t('app.title')">
      <a
        v-for="c in COLLECTIONS"
        :key="c.key"
        class="tab"
        :class="{ active: route.tab === c.key }"
        :aria-current="route.tab === c.key ? 'page' : undefined"
        :href="`#/${c.key}`"
      >{{ t(`tab.${c.key}`) }}</a>
    </nav>
    <div class="header-tools">
      <!-- <span v-if="data.buildId" class="build">{{ t('app.gameBuild', { build: data.buildId }) }}</span> -->
      <div class="external">
        <a class="stars" href="https://github.com/mojimoon/lbol" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/stars/mojimoon/lbol" alt="GitHub stars" height="20"></a>
        <div class="links">
          <a v-for="link in LINKS" :key="link.key" :href="link.url" target="_blank" rel="noopener">{{ t(link.key) }}</a>
        </div>
      </div>
      <div class="prefs">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup>
import { COLLECTIONS } from '../../config/collections.js'
import { data, route, t } from '../../store/codex.js'
import LanguageSwitcher from '../shared/LanguageSwitcher.vue'
import ThemeToggle from '../shared/ThemeToggle.vue'

const LINKS = [
  { key: 'link.miraheze', url: 'https://lbol.miraheze.org' },
  { key: 'link.huiji', url: 'https://lbol.huijiwiki.com' },
  { key: 'link.steam', url: 'https://store.steampowered.com/app/1140150/' },
]
</script>

<style scoped>
.app-header {
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap; flex: none;
  padding: 10px 20px; border-bottom: 1px solid var(--line); background: var(--surface);
}
.brand { font-weight: 700; font-size: 16px; letter-spacing: .04em; color: var(--accent); text-decoration: none; }
.tabs { display: flex; gap: 4px; }
.tab { padding: 6px 14px; border-radius: 6px; color: var(--text-dim); text-decoration: none; font-size: 15px; }
.tab:hover { color: var(--text); background: var(--hover); }
.tab.active { color: var(--text); background: var(--selected); font-weight: 600; }
.header-tools, .external, .prefs { display: flex; align-items: center; gap: 12px; }
.header-tools { margin-left: auto; }
.stars { display: flex; flex: none; }
.build { font-size: 12px; color: var(--text-dim); }
.links { display: flex; gap: 10px; font-size: 13px; white-space: nowrap; }
.links a { color: var(--text-dim); }
.links a:hover { color: var(--accent); }
@media (max-width: 1280px) { .build { display: none; } }
/* Phones: the two 34px rows scroll away and leave only the tabs; a sticky top of minus their height does it. */
@media (max-width: 720px) {
  .app-header {
    position: sticky; top: -68px; z-index: 5; display: grid; gap: 0; padding: 0 12px;
    grid-template: "brand prefs" 34px "external external" 34px "tabs tabs" 44px / minmax(0, 1fr) auto;
    align-items: center;
  }
  .brand { grid-area: brand; font-size: 13px; letter-spacing: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tabs { grid-area: tabs; }
  .tab { flex: 1 1 auto; padding: 6px 4px; font-size: 14px; text-align: center; white-space: nowrap; }
  .header-tools { display: contents; }
  .external { grid-area: external; overflow-x: auto; scrollbar-width: none; }
  .prefs { grid-area: prefs; gap: 6px; margin-left: 8px; }
  .prefs :deep(select) { max-width: 104px; padding: 2px 4px; font-size: 13px; }
  .prefs :deep(.theme-toggle) { width: 28px; height: 28px; font-size: 14px; }
}
</style>
