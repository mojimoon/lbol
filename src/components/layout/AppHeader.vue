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
      <a href="https://github.com/mojimoon/lbol" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/stars/mojimoon/lbol" alt="GitHub stars" height="20"></a>
      <div class="links">
        <a v-for="link in LINKS" :key="link.key" :href="link.url" target="_blank" rel="noopener">{{ t(link.key) }}</a>
      </div>
      <LanguageSwitcher />
      <ThemeToggle />
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
.header-tools { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.build { font-size: 12px; color: var(--text-dim); }
.links { display: flex; gap: 10px; font-size: 13px; white-space: nowrap; }
.links a { color: var(--text-dim); }
.links a:hover { color: var(--accent); }
@media (max-width: 1280px) { .build { display: none; } }
@media (max-width: 640px) {
  .app-header { padding: 8px 12px; gap: 8px 12px; }
  .build { display: none; }
}
</style>
