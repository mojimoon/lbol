"""Enemy entries: game stats and names, plus the hand-written notes of Better LBoL (data/enemy_notes.json).

Note markup (Chinese and English text, from import_better_lbol.py):
    [[0]], [[5,6]], [[1;2]]   the enemy's own moves: one, spell type + spell name, alternatives
    [[S:Id]] [[C:Id]] [[X:Id]] [[J:Id]] [[U:Id]]   status effect, card, exhibit, jade box, enemy
    {Damage1}, {Damage1~2}, {Count1..Count2}, {Count1/2}   EnemyUnitConfig values, per difficulty
    1/1/2                     a value written out for Normal / Hard / Lunatic
    <b>title</b>              a line on its own: starts a section
Values become {"n": "5"} when every difficulty agrees, else {"d": ["5", "6", "7"]}.
"""
import json
import re
from pathlib import Path
from urllib.parse import quote

from opencc import OpenCC

import tables

NOTES = json.loads((Path(__file__).resolve().parent / 'data' / 'enemy_notes.json').read_text(encoding='utf-8'))

# LBoL.EntityLib.Stages.NormalStages: EnemyPoolAct1-3, EliteEnemyPool and BossPool. Act 1 has no BossPool:
# the player picks a prelude opponent (BambooForest.IsSelectingBoss). LunarCapital (Yiji) is not reachable.
STAGES = {
    'BambooForest': {'Normal': [str(n) for n in range(11, 20)], 'Elite': ['Sanyue', 'Aya', 'Rin'],
                     'Boss': ['Reimu', 'Marisa', 'Sakuya', 'Cirno', 'Koishi']},
    'XuanwuRavine': {'Normal': [str(n) for n in range(21, 30)], 'Elite': ['Nitori', 'Youmu', 'Kokoro'],
                     'Boss': ['Long', 'Tianzi', 'Yuyuko']},
    'WindGodLake': {'Normal': [str(n) for n in range(31, 40)], 'Elite': ['Clownpiece', 'Siji', 'Doremy'],
                    'Boss': ['Sanae', 'Remilia', 'Junko']},
    'FinalStage': {'Boss': ['Seija']},
}
KINDS = ['Normal', 'Elite', 'Boss', 'Summon']
# Summons named after another unit: UI template that tells them apart.
NAME_TEMPLATES = {
    'DreamRemilia': 'enemy.nameDream', 'DreamAya': 'enemy.nameDream', 'DreamJunko': 'enemy.nameDream',
    'DreamYoumu': 'enemy.nameDream', 'YinyangyuRedReimu': 'enemy.nameReimuSummon',
    'YinyangyuBlueReimu': 'enemy.nameReimuSummon', 'RavenWen3': 'enemy.namePendant', 'RavenGuo3': 'enemy.namePendant',
    'MaskRed': 'enemy.nameMaskRed', 'MaskGreen': 'enemy.nameMaskGreen', 'MaskBlue': 'enemy.nameMaskBlue',
}
# The mod's own fallbacks for names the game has no text for.
FALLBACK_NAMES = {'BlackResidue': ('黑暗残留', 'Dark Residue'), 'Invincible': ('天衣无缝', 'Flawless'),
                  'InvincibleEternal': ('天衣无缝', 'Flawless'), 'Vampire': ('吸血鬼', 'Vampire')}
HUIJI = 'https://lbol.huijiwiki.com/wiki/'

_MARK = re.compile(
    r'\[\[(?:([CSXUJ]):)?([A-Za-z0-9,;]+)\]\]'
    r'|\{([A-Za-z0-9+*/]+)(?:(~|\.\.)([A-Za-z0-9+*/]+))?\}'
    r'|(?<![\d/])(\d+)/(\d+)/(\d+)(?![\d/])')
_HEADING = re.compile(r'^<b>(.*)</b>$')
_TO_HANT = OpenCC('s2t')


def logic_id(uid):
    return NOTES['logicIds'].get(uid, uid)


def stat(cfg, key, difficulty):
    """EnemyUnitConfig value; Hard falls back to Normal, Lunatic to Hard (EnemyOverviewActions.Value)."""
    if key.isdigit():
        return int(key)
    if key not in cfg:
        raise KeyError(f"{cfg['Id']}: no config value {key}")
    value = cfg[key]
    for level, suffix in ((1, 'Hard'), (2, 'Lunatic')):
        if difficulty >= level and cfg.get(key + suffix) is not None:
            value = cfg[key + suffix]
    return value or 0


def evaluate(expr, cfg, difficulty):
    total = 0
    for term in expr.split('+'):
        parts = re.split(r'([*/])', term)
        value = stat(cfg, parts[0], difficulty)
        for op, operand in zip(parts[1::2], parts[2::2]):
            other = stat(cfg, operand, difficulty)
            value = value * other if op == '*' else value // other
        total += value
    return total


def span(low, high):
    return str(low) if low == high else f'{low}～{high}'


def by_difficulty(values):
    return {'n': values[0]} if len(set(values)) == 1 else {'d': values}


class EnemyText:
    """Turns one language's notes into tokens."""

    def __init__(self, lang, loc, ui, units, codex_ids):
        self.lang, self.loc, self.ui, self.units, self.codex_ids = lang, loc, ui, units, codex_ids
        self.enemy_text = loc.enemy_unit
        self.refs = {'S': [], 'C': [], 'X': [], 'U': []}

    def prose(self, pair):
        if not pair:
            return ''
        if self.lang == 'zh-Hans':
            return pair['zh']
        if self.lang == 'zh-Hant':
            return _TO_HANT.convert(pair['zh'])
        return pair['en']

    def unit_name(self, uid):
        for key in (uid, logic_id(uid)):
            name = (self.loc.unit.get(key) or {}).get('Default')
            if name and not name.startswith('<'):
                break
        else:
            name = uid
        template = self.ui.get(NAME_TEMPLATES.get(uid, ''))
        return template.replace('{name}', name) if template else name

    def move_names(self, uid):
        for key in (uid, logic_id(uid)):
            moves = (self.enemy_text.get(key) or {}).get('Move')
            if moves:
                return [str(m) for m in moves]
        return []

    def move_name(self, uid, selector):
        if selector == '-1':  # Siji: one entry for the ten judgments
            return self.ui['enemy.judgments']
        names = self.move_names(uid)

        def one(index):
            i = int(index)
            if 0 <= i < len(names) and names[i].strip():
                return names[i]
            return self.ui['enemy.move'].replace('{n}', index)
        if ';' in selector:
            return ' / '.join(one(i) for i in selector.split(';'))
        parts = selector.split(',')
        return f'{one(parts[0])}「{one(parts[1])}」' if len(parts) == 2 else one(parts[0])

    def term(self, kind, rid):
        loc = self.loc
        table = {'S': loc.effect, 'C': loc.card, 'X': loc.exhibit, 'J': loc.jade_box}[kind]
        name = (table.get(rid) or {}).get('Name')
        if not name:
            zh, en = FALLBACK_NAMES.get(rid, (rid, rid))
            name = zh if self.lang.startswith('zh') else en
        if kind == 'S':
            name = loc._term_name(name)
        prefix = {'S': 's', 'C': 'c', 'X': 'e'}.get(kind)
        if kind in self.refs and rid not in self.refs[kind]:
            self.refs[kind].append(rid)
        if prefix and (kind == 'S' or rid in self.codex_ids[kind]):
            return {'t': name, 'r': f'{prefix}:{rid}'}
        return {'t': name}

    def tokens(self, text, uid):
        cfg = self.units.get(uid) or self.units.get(logic_id(uid))
        out = []

        def add(tok):
            if isinstance(tok, str) and out and isinstance(out[-1], str):
                out[-1] += tok
            elif tok != '':
                out.append(tok)
        pos = 0
        for m in _MARK.finditer(text):
            add(text[pos:m.start()])
            pos = m.end()
            kind, rid, expr, op, expr2, *triple = m.groups()
            if rid is not None:
                if kind == 'U':
                    if rid not in self.refs['U']:
                        self.refs['U'].append(rid)
                    add({'t': self.unit_name(rid), 'r': f'u:{rid}'})
                elif kind:
                    add(self.term(kind, rid))
                else:
                    add({'t': self.move_name(uid, rid)})
            elif expr is not None:
                values = []
                for d in range(3):
                    low = evaluate(expr, cfg, d)
                    high = low if op is None else (low + evaluate(expr2, cfg, d) if op == '~' else evaluate(expr2, cfg, d))
                    values.append(span(low, high))
                add(by_difficulty(values))
            else:
                add(by_difficulty(list(triple)))
        add(text[pos:])
        return out

    def sections(self, pair, uid):
        """Text with <b>title</b> lines -> [{title, body}]."""
        text = self.prose(pair)
        if not text:
            return []
        out = [{'title': None, 'lines': []}]
        for line in text.split('\n'):
            m = _HEADING.match(line.strip())
            if m:
                out.append({'title': m.group(1), 'lines': []})
            else:
                out[-1]['lines'].append(line)
        result = []
        for s in out:
            body = '\n'.join(s['lines']).strip('\n')
            if body or s['title']:
                result.append({'title': self.tokens(s['title'], uid) if s['title'] else None,
                               'body': self.tokens(body, uid)})
        return result


def expand_group(groups, gid):
    group = groups[gid]
    if group['Subs']:
        return [v for sub in group['Subs'] for v in expand_group(groups, sub)]
    return [[e for e in group['Enemies'] if e != 'Empty']]


def encounters(groups):
    """{enemy id: [{stage, kind, group, members}]} for every enemy a stage can start a battle with."""
    out = {}
    for stage, pools in STAGES.items():
        for kind, ids in pools.items():
            for gid in ids:
                for members in expand_group(groups, gid):
                    for uid in dict.fromkeys(members):
                        entry = {'stage': stage, 'kind': kind, 'group': gid, 'members': members}
                        if entry not in out.setdefault(uid, []):
                            out[uid].append(entry)
    return out


def boss_exhibits(groups, units, codex):
    """{boss id: [exhibit ids]} the boss reward can offer in the boss's own slot (Stage.GetBossExhibits ->
    GameRunController.RollBossExhibits): with RollBossExhibit, the Shining exhibits owned by that character;
    otherwise neutral Shining exhibits of one of the boss's BaseManaColor."""
    shining = [e for e in codex['exhibits'] if e['rarity'] == 'Shining']
    out = {}
    for stage, pools in STAGES.items():
        if stage == 'FinalStage':
            continue
        for gid in pools.get('Boss', []):
            if groups[gid]['RollBossExhibit']:
                out[gid] = [e['id'] for e in shining if e['owner'] == gid]
            else:
                colors = {tables.MANA_COLOR[c] for c in units[gid]['BaseManaColor']}
                out[gid] = [e['id'] for e in shining if not e['owner'] and e['baseMana'] in colors]
    return out


def plain(tokens):
    return ''.join(t if isinstance(t, str) else t.get('t') or t.get('n') or '/'.join(t.get('d', [])) for t in tokens)


def portrait_ids(uid):
    return [uid, logic_id(uid)]


def build_enemies(lang, loc, ui, tables_, codex, portraits):
    units = {u['Id']: u for u in tables_['enemy_units']}
    groups = {g['Id']: g for g in tables_['enemy_groups']}
    seen = encounters(groups)
    rewards = boss_exhibits(groups, units, codex)
    codex_ids = {'C': {c['id'] for c in codex['cards']}, 'X': {e['id'] for e in codex['exhibits']}}
    out = []
    for index, row in enumerate(NOTES['enemies']):
        uid = row['id']
        cfg = units.get(uid)
        if cfg is None:
            continue  # the game no longer has this unit
        text = EnemyText(lang, loc, ui, units, codex_ids)
        actions = NOTES['actions'].get(uid) or NOTES['actions'].get(logic_id(uid)) or {}
        order = NOTES['orders'].get(uid) or NOTES['orders'].get(logic_id(uid))
        mechanics = NOTES['mechanics'].get(uid) or NOTES['mechanics'].get(logic_id(uid))
        passive = text.tokens(text.prose(actions.get('passive')), uid) if actions.get('passive') else []
        moves = [{'name': text.move_name(uid, m['index']), 'desc': text.tokens(text.prose(m), uid)}
                 for m in actions.get('moves', [])]
        order_sections = text.sections(order, uid)
        mechanic_sections = text.sections(mechanics, uid)

        hp = [cfg['MaxHp']]
        hp.append(cfg['MaxHpHard'] if cfg['MaxHpHard'] is not None else hp[0])
        hp.append(cfg['MaxHpLunatic'] if cfg['MaxHpLunatic'] is not None else hp[1])
        add = max(0, cfg['MaxHpAdd'] or 0)
        title = (loc.enemy_unit.get(uid) or loc.enemy_unit.get(logic_id(uid)) or {}).get('Title')
        name = text.unit_name(uid)
        met = seen.get(uid, [])
        together = [m for e in met for m in e['members'] if m != uid]
        img = next((p for p in portrait_ids(uid) if p in portraits), None)
        searchable = [name, uid, title or '', plain(passive)] + [m['name'] + plain(m['desc']) for m in moves]
        out.append({
            'id': uid,
            'name': name,
            'index': index,
            'kind': row['kind'],
            'title': title,
            'img': img,
            'hp': by_difficulty([span(h, h + add) for h in hp]),
            # BattleController.GenerateEnemyPoints: power (P) gained on death.
            'power': span(*cfg['PowerLoot']),
            'bossExhibits': rewards.get(uid, []),
            'stages': list(dict.fromkeys(e['stage'] for e in met)),
            'encounters': [{'stage': e['stage'], 'kind': e['kind'], 'members': e['members']} for e in met],
            'passive': passive,
            'moves': moves,
            'order': order_sections,
            'mechanics': mechanic_sections,
            'relEnemies': list(dict.fromkeys([u for u in text.refs['U'] if u != uid] + together)),
            'relCards': text.refs['C'],
            'relEffects': text.refs['S'],
            'relExhibits': text.refs['X'],
            'wiki': HUIJI + quote(row['page']),
            'search': ' '.join(searchable).lower(),
        })
    return out


def stage_names(loc):
    return {s: (loc.stage.get(s) or {}).get('Name', s) for s in STAGES}
