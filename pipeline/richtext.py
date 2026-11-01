"""Turn game text templates into safe render tokens for the frontend.

Token forms (a description is a list of these; "\\n" stays inside strings):
    "text"                      plain text
    {"n": 10, "up": true}       number; `up` marks a value changed by upgrading
    {"m": "R"}                  mana / icon sprite name
    {"t": "格挡", "r": "k:Block"}  game term; `r` is a term or entity ref (optional)
    {"f": "Active", "c": 3}     friend skill cost badge
    {"x": "Count"}              value only known during a battle
"""
import re

from tables import HYBRID_NAMES

_PLACEHOLDER = re.compile(r"\{([A-Za-z0-9_]+)(?::([^}]*))?\}")
_TAG = re.compile(r"<[^>]*>")
_SPRITE = re.compile(r'<sprite="([^"]+)" name="([^"]+)">')
_COUNTED = re.compile(r"\{(\w+):(plural|cardinal|ordinal) ([^}]*)\}")
_OPTION = re.compile(r"""(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)")""")
# Sheets whose sprite name is unique enough to address directly in the frontend.
_SPRITE_PREFIX = {'ManaSprite': '', 'BaseManaSprite': 'b_', 'Point': 'pt_', 'TextIcon': 'icon_'}
_NOUN_CASE = {'g': 'Genitive', 'd': 'Dative', 'a': 'Accusative'}


class UnitText(str):
    """A unit name plus its grammatical forms (UnitName.yaml), picked by formats such as {PlayerName:sg}."""

    def __new__(cls, entry):
        self = super().__new__(cls, entry.get('Default', ''))
        self.entry = entry
        return self

    def form(self, fmt):
        style = 'Short' if 's' in fmt else 'Full' if 'f' in fmt else 'Default'
        case = next((name for key, name in _NOUN_CASE.items() if key in fmt), '')
        for key in (case + style, case + 'Default', style, 'Default'):
            if self.entry.get(key):
                return self.entry[key]
        return str(self)


def _cardinal(lang, n):
    """Localization.GetCardinalHandler. None means "other"."""
    if lang in ('ru',):
        if n % 10 == 1 and n % 100 != 11:
            return 'one'
    elif lang in ('pl', 'uk'):
        if n == 1:
            return 'one'
    elif lang in ('pt', 'fr'):
        if n <= 1:
            return 'one'
        return 'many' if n % 1000000 == 0 else None
    elif lang in ('en', 'zh-Hans', 'zh-Hant', 'es', 'tr', 'de'):
        return 'one' if n == 1 else None
    else:
        return None
    return 'few' if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else 'many'


def _ordinal(lang, n):
    if lang == 'en':
        tens = n % 100
        return {1: 'one', 2: 'two', 3: 'few'}.get(n % 10) if not 11 <= tens <= 13 else None
    return 'one' if lang == 'fr' and n == 1 else None


def expand_counted(template, lookup, lang):
    """Resolve {Key:plural one='%' other='%s'} first: the chosen text may hold |terms| and %."""
    def choose(match):
        key, kind, body = match.groups()
        options = {m.group(1).lower(): m.group(2) if m.group(2) is not None else m.group(3) for m in _OPTION.finditer(body)}
        value = lookup(key)
        rule = None
        if isinstance(value, int):
            rule = (_ordinal if kind == 'ordinal' else _cardinal)(lang, value)
        text = options.get(rule) or options.get('other') or next(iter(options.values()), '')
        return text.replace('%', '{' + key + '}', 1)
    return _COUNTED.sub(choose, template)


class Mana(dict):
    """Marks a value as a ManaGroup rather than a plain mapping."""


class Symbols(list):
    """A ready-made run of sprite names, e.g. base mana icons."""


def mana_symbols(mana, base=False):
    """Mirror UiUtils.ManaGroupToText / BaseManaGroupToText."""
    prefix = 'b_' if base else ''
    out = []
    if not base:
        if not any(v for k, v in mana.items() if k != 'HybridColor'):
            return ['0']
        if mana['Any']:
            out.append(str(mana['Any']))
    for color in 'WUBRGCP':
        count = mana[color]
        if count > 9:
            out.append(f'{count}x')
            count = 1
        out += [prefix + color] * count
    if not base and mana['Hybrid']:
        out += [HYBRID_NAMES[mana['HybridColor']]] * mana['Hybrid']
    return out


def _format_value(value, fmt, changed):
    """Tokens for a resolved placeholder; None means battle-only."""
    if isinstance(value, Mana):
        return [{'m': s} for s in mana_symbols(value)]
    if isinstance(value, Symbols):
        return [{'m': s} for s in value]
    if isinstance(value, UnitText) and fmt:
        return [value.form(fmt)]
    if isinstance(value, str):
        return [value]
    if isinstance(value, tuple):  # ('Active', 3): friend skill cost
        return [{'f': value[0], 'c': value[1]}]
    return [{'n': value, 'up': True} if changed else {'n': value}]


def _text_tokens(text, lookup, changed_keys):
    """Handle placeholders and sprite tags in a stretch with no |term| markup."""
    out = []
    pos = 0
    for m in re.finditer(_PLACEHOLDER.pattern + '|' + _SPRITE.pattern, text):
        if m.start() > pos:
            out.append(text[pos:m.start()])
        pos = m.end()
        if m.group(1):
            key, fmt = m.group(1), m.group(2)
            value = lookup(key)
            out += [{'x': key}] if value is None else _format_value(value, fmt, key in changed_keys)
        else:
            out.append({'m': _SPRITE_PREFIX.get(m.group(3), '') + m.group(4)})
    if pos < len(text):
        out.append(text[pos:])
    return out


def _plain(tokens):
    parts = []
    for tok in tokens:
        if isinstance(tok, str):
            parts.append(tok)
        elif 'n' in tok:
            parts.append(str(tok['n']))
        elif 't' in tok:
            parts.append(tok['t'])
    return ''.join(parts)


plain_text = _plain


def tokenize(template, lookup=lambda key: None, resolve_term=lambda name: None, changed_keys=(), lang='zh-Hans'):
    """template: game text with {placeholders}, |terms|, <tmp tags>.

    lookup(key)        -> int | str | Mana | ('Active', n) | None (battle-only)
    resolve_term(name) -> ref string | None
    changed_keys       -> placeholders whose value differs from the base card
    """
    if not template:
        return []
    # Keep <sprite>, drop other TextMeshPro tags (<color>, <b>, <indent>...).
    template = _TAG.sub(lambda m: m.group(0) if _SPRITE.fullmatch(m.group(0)) else '', str(template))
    template = expand_counted(template, lookup, lang)
    out = []
    for i, part in enumerate(template.split('|')):
        if i % 2 == 0:
            out += _text_tokens(part, lookup, changed_keys)
        elif part == '':
            out.append('|')  # "||" is an escaped pipe
        else:
            inner = part[2:] if len(part) > 2 and part[1] == ':' else part  # "e:Name": colour code
            parts = _text_tokens(inner, lookup, changed_keys)
            # "|d:(<sprite>, etc.)|": a tinted stretch with icons, not a term. A term is only text.
            if any(isinstance(tok, dict) and ('m' in tok or 'f' in tok) for tok in parts):
                out += parts
                continue
            name = _plain(parts)
            ref = resolve_term(name)
            out.append({'t': name, 'r': ref} if ref else {'t': name})
    return _merge_strings(out)


def _merge_strings(tokens):
    out = []
    for tok in tokens:
        if isinstance(tok, str) and out and isinstance(out[-1], str):
            out[-1] += tok
        elif tok != '':
            out.append(tok)
    return out


if __name__ == '__main__':
    values = {'Damage': 14, 'Value1': 2, 'FriendA': ('Active', 3), 'PlayerName': '主角',
              'Mana': Mana(Any=1, W=0, U=0, B=0, R=2, G=0, C=0, P=0, Hybrid=0, HybridColor=0)}
    got = tokenize('造成 {Damage} 点|e:格挡|。\n{Mana}<color=#fff>{Missing}</color><sprite="Point" name="Gold">{FriendA}'
                   "{Value1:plural one='它' other='它们'}",
                   values.get, lambda n: 'k:Block' if n == '格挡' else None, {'Damage'})
    assert got == ['造成 ', {'n': 14, 'up': True}, ' 点', {'t': '格挡', 'r': 'k:Block'}, '。\n',
                   {'m': '1'}, {'m': 'R'}, {'m': 'R'}, {'x': 'Missing'}, {'m': 'pt_Gold'},
                   {'f': 'Active', 'c': 3}, '它们'], got
    assert tokenize('a||b') == ['a|b']
    assert tokenize('|d:(<sprite="ManaSprite" name="1">, etc.)|') == ['(', {'m': '1'}, ', etc.)']
    many = "{Value1:plural one='% |Unik|' few='% |Uniki|' many='% |Uników|'}"
    assert tokenize(many, {'Value1': 3}.get, lang='pl') == [{'n': 3}, ' ', {'t': 'Uniki'}]
    assert tokenize(many, {'Value1': 5}.get, lang='pl') == [{'n': 5}, ' ', {'t': 'Uników'}]
    assert tokenize(many, {'Value1': 1}.get, lang='pl') == [{'n': 1}, ' ', {'t': 'Unik'}]
    assert tokenize("{V:plural one='x' other='y'}", {'V': 2}.get, lang='ja') == ['y']
    assert tokenize("{V:ordinal one='%st' two='%nd' few='%rd' other='%th'}", {'V': 2}.get, lang='en') == [{'n': 2}, 'nd']
    player = UnitText({'Default': 'Игрок', 'Short': 'Ин', 'GenitiveDefault': 'Игрока'})
    assert tokenize('{P:g}/{P:s}/{P}', {'P': player}.get) == ['Игрока/Ин/Игрок']
    assert mana_symbols(Mana(Any=0, W=0, U=0, B=0, R=0, G=0, C=0, P=0, Hybrid=0, HybridColor=0)) == ['0']
    assert mana_symbols(Mana(Any=0, W=0, U=0, B=0, R=0, G=0, C=0, P=0, Hybrid=2, HybridColor=2)) == ['HWR', 'HWR']
    print('richtext ok')
