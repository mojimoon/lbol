"""Build the codex data and images from an installed copy of the game.

    python pipeline/build.py [--no-images] [--force-images]

Outputs public/data/lbol.<lang>.json, public/data/languages.json, public/img/.
Add a language by adding it to LANGS and creating locales/<code>.json.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

import assets
import card_values
import random_pools
import tables
from richtext import Mana, Symbols, UnitText, mana_symbols, plain_text, tokenize

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = Path(os.environ.get('LBOL_GAME_DIR', r'D:\SteamLibrary\steamapps\common\LBoL'))
DATA_DIR = GAME_DIR / 'LBoL_Data'
AA_DIR = DATA_DIR / 'StreamingAssets' / 'aa' / 'StandaloneWindows64'
PUBLIC = ROOT / 'public'
IMG = PUBLIC / 'img'

DEFAULT_LANG = 'zh-Hans'
FALLBACK_LANG = 'en'  # for text a language lacks, and for browsers in no listed language
# code: display name. Codes are the game's Localization folder names.
LANGS = {
    'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', 'en': 'English', 'ja': '日本語', 'ko': '한국어', 'de': 'Deutsch',
    'es': 'Español', 'fr': 'Français', 'hu': 'Magyar', 'it': 'Italiano', 'pl': 'Polski', 'pt': 'Português',
    'ru': 'Русский', 'tr': 'Türkçe', 'uk': 'Українська', 'vi': 'Tiếng Việt',
}
# UI strings the game already has, used for every language except the reviewed DEFAULT_LANG file.
GAME_UI = {
    'tab.exhibits': 'Game.Exhibit', 'tab.characters': 'MainMenu.Characters', 'lang.label': 'Setting.Language',
    'filter.search': 'Museum.TextFilterHint', 'filter.searchLabel': 'Museum.TextFilterHint',
    'filter.owner': 'Museum.Character', 'filter.type': 'Museum.CardType', 'filter.cost': 'Museum.ManaCost',
    'filter.rarity': 'Museum.Rarity', 'filter.color': 'Museum.ManaType', 'filter.keyword': 'Setting.Keyword',
    'filter.baseMana': 'Tooltip.BaseMana.Name', 'filter.upgraded': 'Museum.UpgradedFilter',
    'filter.illustrator': 'Game.IllustratorOrder', 'pool.mana': 'Tooltip.BaseMana.Name',
    'sort.default': 'Game.IndexOrder', 'sort.cost': 'Game.ManaAmountOrder', 'sort.rarity': 'Game.RarityOrder',
    'sort.illustrator': 'Game.IllustratorOrder', 'detail.before': 'CardDetail.UpgradeNo', 'detail.after': 'CardDetail.UpgradeYes',
    'detail.notUpgradable': 'Cards.UnUpgradable', 'detail.illustrator': 'CardDetail.Illustrator', 'detail.altArt': 'Museum.CardStyleFilter',
    'detail.keywords': 'Setting.Keyword', 'char.hp': 'StartGame.StartHp', 'char.money': 'StartGame.StartMoney',
    'char.mana': 'Tooltip.BaseMana.Name', 'char.exhibit': 'StartGame.SkillExhibit', 'char.deck': 'StartGame.CheckDeck',
}

ENUM_SECTIONS = ('Rarity', 'CardType')
FORBIDDEN_BIT = next(bit for name, bit, _ in tables.KEYWORDS if name == 'Forbidden')
# Typos in the game's translations, which its own formatter would leave blank.
PLACEHOLDER_FIXES = {name.lower(): name for name in (
    'Value1', 'Value2', 'Value3', 'Damage', 'Block', 'Shield', 'Mana', 'Scry', 'PlayerName', 'SelfName', 'OwnerName')}
PLACEHOLDER_FIXES.update({'vaule1': 'Value1', 'seflname': 'SelfName'})
GADGETS_BIT = next(bit for name, bit, _ in tables.KEYWORDS if name == 'Gadgets')
# File name part of each card frame, per card colour (colourless shares the "any" frame).
FRAME_COLOR = {'W': 'white', 'U': 'blue', 'B': 'black', 'R': 'red', 'G': 'green', 'C': 'any'}
# ponytail: work-in-progress characters are left out entirely; remove the id to include one.
EXCLUDED_CHARACTERS = {'Alice'}


def _read_yaml(lang, name):
    path = DATA_DIR / 'StreamingAssets' / 'Localization' / lang / f'{name}.yaml'
    return (yaml.safe_load(path.read_text(encoding='utf-8-sig')) or {}) if path.exists() else {}


def _merged(base, own):
    out = dict(base)
    for key, value in own.items():
        out[key] = _merged(out[key], value) if isinstance(value, dict) and isinstance(out.get(key), dict) else value
    return out


def load_yaml(lang, name):
    """A language's text, with English filling whatever its translation has not covered."""
    own = _read_yaml(lang, name)
    return own if lang == FALLBACK_LANG else _merged(_read_yaml(FALLBACK_LANG, name), own)


def nested(table, dotted):
    for key in dotted.split('.'):
        table = table.get(key) if isinstance(table, dict) else None
    return table


def keyword_names(bits, *, auto_only=False):
    return [n for n, bit, auto in tables.KEYWORDS if bits & bit and (auto or not auto_only)]


def load_tables():
    raw = assets.read_config_bytes(DATA_DIR)
    kept = lambda rows, key: [r for r in rows if r[key] not in EXCLUDED_CHARACTERS]
    return {
        'cards': kept(tables.read_table(raw['CardConfig'], tables.card), 'Owner'),
        'exhibits': kept(tables.read_table(raw['ExhibitConfig'], tables.exhibit), 'Owner'),
        'players': kept(tables.read_table(raw['PlayerUnitConfig'], tables.player_unit), 'Id'),
        'ultimates': tables.read_table(raw['UltimateSkillConfig'], tables.ultimate_skill),
        'effects': tables.read_table(raw['StatusEffectConfig'], tables.status_effect),
    }


def card_image_keys(card):
    """Mirror CardWidget.RefreshCardImage: image id + illustrator suffix for alternate art."""
    base = card['ImageId'] or card['Id']
    return base, card['UpgradeImageId'], [(ill, base + ill) for ill in card['SubIllustrator']]


def visible_cards(rows, image_names):
    """Mirror MuseumPanel: drop debug cards. HideMesuem cards stay (flagged), other cards link to them."""
    out = []
    for c in rows:
        if c['DebugLevel'] > 1:
            continue
        if c['DebugLevel'] == 1 and (c['ImageId'] or c['Id']) not in image_names:
            continue
        out.append(c)
    return out


def export_images(t, force):
    card_wanted = {}
    for c in t['cards']:
        base, upgraded, alts = card_image_keys(c)
        card_wanted[base] = assets.safe_name(base)
        if upgraded:
            card_wanted[upgraded] = assets.safe_name(upgraded)
        for i, (_, key) in enumerate(alts):
            card_wanted[key] = f"{assets.safe_name(base)}__{i}"
    missing = assets.export_bundle(AA_DIR / 'cardimages_assets_cardimages.bundle', card_wanted, IMG / 'cards',
                                   force, assets.CARD_MAX_SIDE)

    icon_wanted = {e['Id']: e['Id'] for e in t['exhibits']}
    icon_wanted.update({(s['ImageId'] or s['Id']): (s['ImageId'] or s['Id']) for s in t['effects']})
    missing_icons = assets.export_bundle(AA_DIR / 'uiicons_assets_all.bundle', icon_wanted, IMG / 'icons', force,
                                         quality=88)

    portraits = {}
    for p in t['players']:
        if p['IsSelectable']:
            portraits.update({p['Id']: p['Id'], f"{p['Id']}_Portrait": f"{p['Id']}_Portrait",
                              f"{p['Id']}_Avatar": f"{p['Id']}_Avatar"})
    missing_stand = assets.export_bundle(AA_DIR / 'standpicture_assets_assets_aa_standpicture.bundle', portraits,
                                         IMG / 'characters', force, assets.PORTRAIT_MAX_SIDE)
    icons = assets.export_mana_icons(DATA_DIR, IMG / 'mana', force)
    assets.export_card_ui(DATA_DIR, IMG / 'card-ui', EXCLUDED_CHARACTERS, force)
    print(f'images: {len(card_wanted)} card keys, {len(icon_wanted)} icons, {len(portraits)} portraits, {icons} text icons')
    return {'cards': missing, 'icons': missing_icons, 'characters': missing_stand}


def existing_stems(subdir):
    folder = IMG / subdir
    return {p.stem for p in folder.glob('*.webp')} if folder.exists() else set()


class Localizer:
    """All per-language text for one build."""

    def __init__(self, lang, t):
        self.lang = lang
        self.card = load_yaml(lang, 'Card')
        self.exhibit = load_yaml(lang, 'Exhibit')
        self.keyword = load_yaml(lang, 'Keyword')
        self.effect = load_yaml(lang, 'StatusEffect')
        self.player = load_yaml(lang, 'PlayerUnit')
        self.unit = load_yaml(lang, 'UnitName')
        self.ultimate = load_yaml(lang, 'UltimateSkill')
        self.common = load_yaml(lang, 'Common')
        self.player_name = UnitText(self.unit.get('DefaultPlayer') or {})
        self.owner_name = UnitText(self.unit.get('DefaultOwner') or {})
        self.dynamic = defaultdict(set)  # placeholder -> entity ids that need battle state

        # Name -> ref, used to link |term| markup. First source wins: keywords before effects before entities.
        self.term_refs = {}
        for kw, entry in self.keyword.items():
            self.term_refs.setdefault(self._term_name(entry.get('Name')), f'k:{kw}')
        for se in t['effects']:
            self.term_refs.setdefault(self.effect.get(se['Id'], {}).get('Name'), f"s:{se['Id']}")
        for c in t['cards']:
            self.term_refs.setdefault(self.card.get(c['Id'], {}).get('Name'), f"c:{c['Id']}")
        for e in t['exhibits']:
            self.term_refs.setdefault(self.exhibit.get(e['Id'], {}).get('Name'), f"e:{e['Id']}")
        self.term_refs.pop(None, None)

    @staticmethod
    def _term_name(name):
        """Keyword names carry display extras: '占卜\u2006X', '三色<sprite ...>'."""
        return re.sub(r'<[^>]*>|[\s\u2006]+[XY]$', '', name).strip() if name else name

    def canon_keywords(self, ids):
        """Some keywords share a display name (Copy, CopyHint); list each name once."""
        out = []
        for kw in ids:
            ref = self.term_refs.get(self._term_name(self.keyword.get(kw, {}).get('Name')), f'k:{kw}')
            out.append(ref[2:] if ref.startswith('k:') else kw)
        return list(dict.fromkeys(out))

    def term(self, name):
        # Text may include the amount inside the term: |占卜 2|
        return self.term_refs.get(name) or self.term_refs.get(re.sub(r'[\s\u2006]*\d+$', '', name))

    def tokens(self, template, lookup, entity_id='', changed=()):
        def tracked(key):
            key = PLACEHOLDER_FIXES.get(key.lower(), key)
            value = lookup(key)
            if value is None and entity_id:
                self.dynamic[key].add(entity_id)
            return value
        return tokenize(template, tracked, self.term, changed, self.lang)


def _upgraded_getter(card, upgraded):
    def get(key):
        if upgraded:
            value = card.get(f'Upgraded{key}')
            if value is not None:
                return value
        return card.get(key)
    return get


def card_lookup(card, upgraded, text_name, loc):
    get = _upgraded_getter(card, upgraded)
    entry = card_values.BY_CARD.get(card['Id'], {})

    def resolve(key):
        if key in entry or key in card_values.GLOBAL:
            value = entry[key] if key in entry else card_values.GLOBAL[key]
            if callable(value):
                value = value(get)
            elif isinstance(value, tuple):
                value = value[1 if upgraded else 0]
            return Mana(value) if isinstance(value, dict) else value
        if key in ('Damage', 'Block', 'Shield', 'Value1', 'Value2', 'Scry', 'MoneyCost', 'Loyalty'):
            return get(key)
        if key == 'Mana':
            value = get('Mana')
            return Mana(value) if value else None
        if key == 'KickerCost':
            value = get('Kicker')
            return Mana(value) if value else None
        if key == 'DeckCounter':
            return card['ToolPlayableTimes']
        if key == 'SelfName':
            return text_name
        if key == 'PlayerName':
            return loc.player_name
        if key == 'OwnerName':
            return loc.owner_name
        for name, field, kind in (('FriendP', 'PassiveCost', 'Passive'), ('FriendA', 'ActiveCost', 'Active'),
                                  ('FriendA2', 'ActiveCost2', 'Active'), ('FriendU', 'UltimateCost', 'Ultimate')):
            if key == name:
                return (kind, get(field))
        if key == 'FriendS':
            return ''  # "<indent=80>": line layout only
        return None
    return resolve


def card_description(card, text, upgraded):
    """Out-of-battle text, following Card.GetBaseDescription."""
    if card['EmptyDescription']:
        return ''
    base = text.get('Description')
    up = text.get('UpgradedDescription')
    if card['Type'] == 5:  # Friend cards always list their skill lines
        parts = [up or base if upgraded else base]
        for i in (1, 2, 3):
            parts.append((upgraded and text.get(f'UpgradedExtraDescription{i}')) or text.get(f'ExtraDescription{i}'))
        return '\n'.join(p for p in parts if p)
    nonbattle = text.get('NonbattleDescription')
    if upgraded:
        return text.get('UpgradedNonbattleDescription') or up or nonbattle or base or ''
    return nonbattle or base or ''


def build_card_face(card, upgraded, text, loc, base_values=None):
    get = _upgraded_getter(card, upgraded)
    cost = get('Cost')
    lookup = card_lookup(card, upgraded, text.get('Name', card['Id']), loc)
    template = card_description(card, text, upgraded)
    changed = set()
    if base_values:
        changed = {k for k, v in base_values.items() if lookup(k) != v}
    tokens = loc.tokens(template, lookup, card['Id'], changed)

    bits = card['UpgradedKeywords'] if upgraded else card['Keywords']
    auto = keyword_names(bits, auto_only=True)
    if auto:
        names = [{'t': loc._term_name(loc.keyword.get(k, {}).get('Name', k)), 'r': f'k:{k}'} for k in auto]
        line = []
        for i, name in enumerate(names):
            line += [' ', name] if i else [name]
        tokens = tokens + (['\n'] if tokens else []) + line
    symbols = mana_symbols(cost)
    if card['IsXCost']:
        symbols = ['X'] + ([] if symbols == ['0'] else symbols)
    # Filterable keywords: the card's own, those it references, and any named in its text.
    relative = card['UpgradedRelativeKeyword'] if upgraded else card['RelativeKeyword']
    mentioned = [tok['r'][2:] for tok in tokens if isinstance(tok, dict) and tok.get('r', '').startswith('k:')]
    return {
        'cost': symbols,
        'total': sum(v for k, v in cost.items() if k != 'HybridColor'),
        'isX': card['IsXCost'],
        'forbidden': bool(bits & FORBIDDEN_BIT),
        'loyalty': get('Loyalty'),
        'desc': tokens,
        'keywords': loc.canon_keywords(keyword_names(bits | relative) + mentioned),
    }


def template_keys(*templates):
    keys = set()
    for t in templates:
        keys |= set(re.findall(r'\{([A-Za-z0-9_]+)', str(t or '')))
    return keys


def card_frames(card):
    """Mirror CardWidget.GetBgTexture: frame names for (main, optional second colour)."""
    rarity = tables.RARITY[card['Rarity']].lower()
    kind = tables.CARD_TYPE[card['Type']]
    colors = [tables.MANA_COLOR[c] for c in card['Colors']]
    if kind in ('Tool', 'Misfortune'):
        return [f'bg_{rarity}{kind.lower()}']
    if len(colors) >= 3:
        return [f'bg_{rarity}rainbow']
    return [f'bg_{rarity}{FRAME_COLOR[c]}' for c in colors] or [f'bg_{rarity}any']


def in_random_pool(card):
    """Static part of GameRunController's card roll (Library.EnumerateRollableCardTypes + filters)."""
    return (card['IsPooled'] and card['DebugLevel'] == 0 and not card['Pack']
            and tables.CARD_TYPE[card['Type']] not in ('Unknown', 'Misfortune', 'Status'))


def card_special(card, *faces):
    special = []
    if len(card['Colors']) >= 3:
        special.append('multi')
    if card['Id'] in random_pools.DISCOVER:
        special.append('discover')
    # "P points": Power, by the sprite or keyword in the text. Sprites and keyword ids are the same in every language.
    tokens = [tok for face in faces if face for tok in face['desc'] if isinstance(tok, dict)]
    if any(tok.get('m') == 'pt_Power' for tok in tokens) or any('Power' in face['keywords'] for face in faces if face):
        special.append('power')
    return special


def build_card(card, loc, images):
    text = loc.card.get(card['Id'], {})
    name = text.get('Name', card['Id'])
    face = build_card_face(card, False, text, loc)
    up = None
    if card['IsUpgradable']:
        base_lookup = card_lookup(card, False, name, loc)
        keys = template_keys(card_description(card, text, False), card_description(card, text, True))
        up = build_card_face(card, True, text, loc, {k: base_lookup(k) for k in keys})

    base_key, up_key, alts = card_image_keys(card)
    stem = assets.safe_name(base_key)
    has = stem in images
    alt_list = []
    for i, (ill, _) in enumerate(alts):
        alt_stem = f'{stem}__{i}'
        if alt_stem in images:
            alt_list.append({'ill': ill, 'img': alt_stem})
    entry = {
        'id': card['Id'],
        'name': name,
        'index': card['Index'],
        'type': tables.CARD_TYPE[card['Type']],
        'rarity': tables.RARITY[card['Rarity']],
        'colors': [tables.MANA_COLOR[c] for c in card['Colors']],
        'owner': card['Owner'],
        'illustrator': card['Illustrator'] or None,
        'img': stem if has else None,
        'imgUp': assets.safe_name(up_key) if up_key and assets.safe_name(up_key) in images else None,
        'alts': alt_list,
        'pooled': in_random_pool(card),
        'special': card_special(card, face, up),
        'poolCost': {k: v for k, v in card['Cost'].items() if v},
        'findInBattle': card['FindInBattle'],
        'gadget': bool(card['Keywords'] & GADGETS_BIT),
        'roll': random_pools.roll_spec(card),
        'frames': card_frames(card),
        'hidden': card['HideMesuem'],
        'flavor': loc.tokens(text.get('FlavorText'), lambda k: name if k == 'SelfName' else loc.player_name if k == 'PlayerName' else None),
        'detail': loc.tokens(text.get('DetailText'), card_lookup(card, False, name, loc), card['Id']),
        'base': face,
        'up': up,
        'relCards': sorted(set(card['RelativeCards']) | set(card['UpgradedRelativeCards'])),
        'relEffects': sorted(set(card['RelativeEffects']) | set(card['UpgradedRelativeEffects'])),
        'search': ' '.join(filter(None, (name, card['Id'], plain_text(face['desc']), plain_text(up['desc']) if up else ''))).lower(),
    }
    return entry


def exhibit_lookup(ex, loc, name):
    def resolve(key):
        if key in ('Value1', 'Value2', 'Value3', 'InitialCounter'):
            return ex.get(key)
        if key == 'Counter':
            return ex['InitialCounter'] or 0
        if key == 'Mana':
            return Mana(ex['Mana']) if ex['Mana'] else None
        if key == 'SelfName':
            return name
        if key == 'PlayerName':
            return loc.player_name
        return None
    return resolve


def build_exhibit(ex, loc, icons):
    text = loc.exhibit.get(ex['Id'], {})
    name = text.get('Name', ex['Id'])
    lookup = exhibit_lookup(ex, loc, name)
    base_color = tables.MANA_COLOR[ex['BaseManaColor']] if ex['BaseManaColor'] is not None else None
    base_mana = [f'b_{base_color}'] * ex['BaseManaAmount'] if base_color else []

    desc = loc.tokens(text.get('Description'), lambda k: Symbols(base_mana) if k == 'BaseMana' else lookup(k), ex['Id'])
    return {
        'id': ex['Id'],
        'name': name,
        'index': ex['Index'],
        'exhibitType': f"T{ex['Index'] // 100}",  # MuseumPanel: section = Index / 100
        'rarity': tables.RARITY[ex['Rarity']],
        'owner': ex['Owner'] or None,
        'appearance': tables.APPEARANCE[ex['Appearance']],
        'baseMana': base_color,
        # GameRunController: Shining exhibits go to their own pool whatever IsPooled says.
        'pooled': ex['IsPooled'] or tables.RARITY[ex['Rarity']] == 'Shining',
        'img': ex['Id'] if ex['Id'] in icons else None,
        'flavor': loc.tokens(text.get('FlavorText'), lambda k: name if k == 'SelfName' else loc.player_name if k == 'PlayerName' else None),
        'desc': desc,
        'keywords': loc.canon_keywords(keyword_names(ex['Keywords'])),
        'relCards': ex['RelativeCards'],
        'relEffects': ex['RelativeEffects'],
        'search': f"{name} {ex['Id']} {plain_text(desc)}".lower(),
    }


def build_ultimate(us, loc, icons):
    text = loc.ultimate.get(us['Id'], {})
    extra = card_values.ULTIMATE.get(us['Id'], {})

    def lookup(key):
        if key in extra:
            return extra[key](us) if callable(extra[key]) else extra[key]
        if key in ('Damage', 'Value1', 'Value2'):
            return us[key]
        if key == 'PlayerName':
            return loc.player_name
        return None
    title = text.get('Title')
    content = text.get('Content')
    spell = loc.common.get('UI', {})
    return {
        'id': us['Id'],
        'name': (spell['SpellTitled'].replace('{0}', title).replace('{1}', content) if title
                 else spell['SpellUntitled'].replace('{0}', content or '')).strip(),
        'cost': us['PowerCost'],
        'desc': loc.tokens(text.get('Description'), lookup, us['Id']),
        'relEffects': us['RelativeEffects'],
        'relCards': us['RelativeCards'],
    }


def build_character(p, loc, ultimates, exhibits, stems):
    unit = loc.unit.get(p['Id'], {})
    text = loc.player.get(p['Id'], {})

    left, right = tables.MANA_COLOR[p['LeftColor']], tables.MANA_COLOR[p['RightColor']]
    if p['InitialMana'][left] != 2 or p['InitialMana'][right] != 2:
        raise ValueError(f"{p['Id']}: starting mana is no longer 2 + 2")

    def loadout(side):
        deck = Counter(p[f'Deck{side}'])
        exhibit = exhibits[p[f'Exhibit{side}']]
        extra = [tables.MANA_COLOR[exhibit['BaseManaColor']]] * exhibit['BaseManaAmount'] if exhibit['BaseManaColor'] is not None else []
        return {
            # Base mana of a run: the character's 2 + 2, plus what the starting exhibit provides.
            'mana': [left, left, *extra, right, right],
            'ultimate': ultimates.get(p[f'UltimateSkill{side}']),
            'exhibit': p[f'Exhibit{side}'],
            'deck': [{'id': cid, 'count': n} for cid, n in deck.items()],
            'difficulty': p[f'Difficulty{side}'],
        }
    return {
        'id': p['Id'],
        'name': unit.get('Default', p['Id']),
        'shortName': unit.get('Short') or unit.get('Default', p['Id']),
        'fullName': unit.get('Full') or unit.get('Default', p['Id']),
        'title': text.get('Title'),
        'home': text.get('HomeName') if p['HasHomeName'] else None,
        'colors': [left, right],
        'hp': p['MaxHp'],
        'money': p['InitialMoney'],
        'stand': p['Id'] if p['Id'] in stems else None,
        'portrait': f"{p['Id']}_Portrait" if f"{p['Id']}_Portrait" in stems else None,
        'avatar': f"{p['Id']}_Avatar" if f"{p['Id']}_Avatar" in stems else None,
        'loadouts': {'A': loadout('A'), 'B': loadout('B')},
    }


def build_terms(t, loc, icons):
    terms = {}
    for kw, name_entry in loc.keyword.items():
        if not isinstance(name_entry, dict):
            continue
        terms[f'k:{kw}'] = {'name': loc._term_name(name_entry.get('Name', kw)),
                            'desc': loc.tokens(name_entry.get('Description'), lambda k: None)}
    for se in t['effects']:
        text = loc.effect.get(se['Id'])
        if not text:
            continue
        stem = se['ImageId'] or se['Id']
        fixed = card_values.STATUS.get(se['Id'], {})

        def lookup(k, fixed=fixed, se=se):
            if k in fixed:
                return fixed[k]
            if k == 'TriggerLevel':
                return se['StackActionTriggerLevel']
            return {'PlayerName': loc.player_name, 'OwnerName': loc.owner_name}.get(k)
        terms[f"s:{se['Id']}"] = {'name': text.get('Name', se['Id']),
                                  'desc': loc.tokens(text.get('Brief') or text.get('Description'), lookup, f"s:{se['Id']}"),
                                  'icon': stem if stem in icons else None,
                                  'negative': se['Type'] == 1}
    return terms


def load_ui(lang, loc):
    def read(code):
        return json.loads((ROOT / 'locales' / f'{code}.json').read_text(encoding='utf-8'))
    if lang == DEFAULT_LANG:
        return read(lang)
    ui = {**read(FALLBACK_LANG), **read(lang)}
    for key, source in GAME_UI.items():
        text = nested(loc.common, source)
        if isinstance(text, str) and text.strip():
            ui[key] = re.sub(r'[:：]\s*$', '', text.strip())
    rate = nested(loc.common, 'StartGame.Rate')
    if rate:
        ui['char.difficulty'] = f'{rate} {{n}}'
    philosophy = loc._term_name(loc.keyword.get('Philosophy', {}).get('Name'))
    if philosophy:
        ui['mana.P'] = philosophy
    names = {'{power}': loc._term_name(loc.keyword.get('Power', {}).get('Name', '')),
             '{loyalty}': loc._term_name(loc.keyword.get('Loyalty', {}).get('Name', ''))}
    for key, text in ui.items():
        for placeholder, name in names.items():
            text = text.replace(placeholder, name)
        ui[key] = text
    return ui


def build_lang(lang, t, stems, build_id):
    loc = Localizer(lang, t)
    cards = visible_cards(t['cards'], stems['card_keys'])
    ultimates = {u['Id']: build_ultimate(u, loc, stems['icons']) for u in t['ultimates']}
    players = sorted((p for p in t['players'] if p['IsSelectable']), key=lambda p: p['Order'])
    data = {
        'lang': lang,
        'buildId': build_id,
        'ui': load_ui(lang, loc),
        'enums': {**{s: loc.common.get(s, {}) for s in ENUM_SECTIONS},
                  'ExhibitType': loc.common.get('Museum', {}).get('ExhibitType', {})},
        'terms': build_terms(t, loc, stems['icons']),
        'cards': sorted((build_card(c, loc, stems['cards']) for c in cards), key=lambda c: c['index']),
        'exhibits': sorted((build_exhibit(e, loc, stems['icons']) for e in t['exhibits'] if not e['IsDebug']),
                           key=lambda e: e['index']),
        'characters': [build_character(p, loc, ultimates, {e['Id']: e for e in t['exhibits']}, stems['characters']) for p in players],
    }
    return data, loc


def write_report(loc, missing):
    reports = ROOT / 'reports'
    reports.mkdir(exist_ok=True)
    lines = ['# 没有固定数值的占位符', '',
             '这些值在图鉴中显示为“X”，`s:` 开头的是状态效果（层数等由施加来源决定）。'
             '能静态确定的值请加到 `pipeline/card_values.py`。', '']
    for key, ids in sorted(loc.dynamic.items(), key=lambda kv: -len(kv[1])):
        lines.append(f"- `{key}` ({len(ids)}): {', '.join(sorted(ids))}")
    lines += ['', '# 没有在资源包中找到的图片', '']
    for kind, names in (missing or {}).items():
        lines.append(f"- {kind} ({len(names)}): {', '.join(names)}")
    (reports / 'build_report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-images', action='store_true', help='reuse images already in public/img')
    ap.add_argument('--force-images', action='store_true', help='re-encode existing images')
    args = ap.parse_args()
    if not DATA_DIR.exists():
        sys.exit(f'game data not found at {DATA_DIR}; set LBOL_GAME_DIR')

    t = load_tables()
    missing = None if args.no_images else export_images(t, args.force_images)
    stems = {'cards': existing_stems('cards'), 'icons': existing_stems('icons'), 'characters': existing_stems('characters')}
    stems['card_keys'] = {name for name in (card_image_keys(c)[0] for c in t['cards']) if assets.safe_name(name) in stems['cards']}

    manifest = (GAME_DIR.parent.parent / 'appmanifest_1140150.acf')
    match = re.search(r'"buildid"\s+"(\d+)"', manifest.read_text(encoding='utf-8')) if manifest.exists() else None
    build_id = match.group(1) if match else None

    out = PUBLIC / 'data'
    out.mkdir(parents=True, exist_ok=True)
    for lang in LANGS:
        data, loc = build_lang(lang, t, stems, build_id)
        (out / f'lbol.{lang}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f"[{lang}] {len(data['cards'])} cards, {len(data['exhibits'])} exhibits, {len(data['characters'])} characters, "
              f"{len(loc.dynamic)} placeholders without a fixed value")
        if lang == DEFAULT_LANG:
            write_report(loc, missing)
    (out / 'languages.json').write_text(
        json.dumps({'default': FALLBACK_LANG, 'languages': [{'code': c, 'name': n} for c, n in LANGS.items()]},
                   ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()
