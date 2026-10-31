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
_PLURAL = re.compile(r"plural one='([^']*)' other='([^']*)'")
# Sheets whose sprite name is unique enough to address directly in the frontend.
_SPRITE_PREFIX = {'ManaSprite': '', 'BaseManaSprite': 'b_', 'Point': 'pt_', 'TextIcon': 'icon_'}


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
    if isinstance(value, str):
        return [value]
    if isinstance(value, tuple):  # ('Active', 3): friend skill cost
        return [{'f': value[0], 'c': value[1]}]
    if fmt:
        plural = _PLURAL.match(fmt)
        if plural:
            return [plural.group(1) if value == 1 else plural.group(2)]
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


def tokenize(template, lookup=lambda key: None, resolve_term=lambda name: None, changed_keys=()):
    """template: game text with {placeholders}, |terms|, <tmp tags>.

    lookup(key)        -> int | str | Mana | ('Active', n) | None (battle-only)
    resolve_term(name) -> ref string | None
    changed_keys       -> placeholders whose value differs from the base card
    """
    if not template:
        return []
    # Keep <sprite>, drop other TextMeshPro tags (<color>, <b>, <indent>...).
    template = _TAG.sub(lambda m: m.group(0) if _SPRITE.fullmatch(m.group(0)) else '', str(template))
    out = []
    for i, part in enumerate(template.split('|')):
        if i % 2 == 0:
            out += _text_tokens(part, lookup, changed_keys)
        elif part == '':
            out.append('|')  # "||" is an escaped pipe
        else:
            inner = part[2:] if len(part) > 2 and part[1] == ':' else part  # "e:Name": colour code
            name = _plain(_text_tokens(inner, lookup, changed_keys))
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
    assert mana_symbols(Mana(Any=0, W=0, U=0, B=0, R=0, G=0, C=0, P=0, Hybrid=0, HybridColor=0)) == ['0']
    assert mana_symbols(Mana(Any=0, W=0, U=0, B=0, R=0, G=0, C=0, P=0, Hybrid=2, HybridColor=2)) == ['HWR', 'HWR']
    print('richtext ok')
