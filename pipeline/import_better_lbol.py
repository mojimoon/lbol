"""Import the enemy notes and card ratings of the Better LBoL mod (Steam Workshop 3808435406).

    python pipeline/import_better_lbol.py <decompiled CardControl project dir>

Decompile CardControl.dll first: `ilspycmd -p -o <dir> CardControl.dll` (needs DOTNET_ROLL_FORWARD=Major).
Writes pipeline/data/enemy_notes.json and pipeline/data/card_ratings.tsv, which build.py reads.
The notes are hand-written Chinese and English text; their markup is described in enemies.py.
"""
import json
import re
import shutil
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent / 'data'
STRING = re.compile(r'"((?:[^"\\]|\\.)*)"')


def strings(line):
    return [json.loads(f'"{s}"') for s in STRING.findall(line)]


def records(path):
    """Records.Add("Id", new string[2] { "zh", "en" }) -> {id: {zh, en}}"""
    out = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        if 'Records.Add(' in line:
            rid, zh, en = strings(line)
            out[rid] = {'zh': zh, 'en': en}
    return out


def actions(path):
    """Add("Id", "zh", "en", new Move("0", "zh", "en"), ...) -> {id: {passive, moves}}"""
    out = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line.startswith('Add("'):
            continue
        s = strings(line)
        rid, zh, en, rest = s[0], s[1], s[2], s[3:]
        out[rid] = {
            'passive': {'zh': zh, 'en': en} if zh or en else None,
            'moves': [{'index': rest[i], 'zh': rest[i + 1], 'en': rest[i + 2]} for i in range(0, len(rest), 3)],
        }
    return out


def entries(path):
    """N/E/B/S("Id", "中文名", "page") rows of EnemyOverviewData, in the mod's display order."""
    out = []
    kinds = {'N': 'Normal', 'E': 'Elite', 'B': 'Boss', 'S': 'Summon'}
    for m in re.finditer(r'\b([NEBS])\(("(?:[^"\\]|\\.)*"(?:, "(?:[^"\\]|\\.)*")*)\)', path.read_text(encoding='utf-8')):
        s = strings(m.group(2))
        out.append({'id': s[0], 'kind': kinds[m.group(1)], 'page': s[2] if len(s) > 2 else s[1]})
    logic = dict(re.findall(r'"(\w+)" => "(\w+)"', path.read_text(encoding='utf-8')))
    return out, logic


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    code = src / 'CardControl'
    rows, logic = entries(code / 'EnemyOverviewData.cs')
    notes = {
        'source': 'Better LBoL (Steam Workshop 3808435406)',
        'enemies': rows,
        'logicIds': logic,
        'actions': actions(code / 'EnemyOverviewActions.cs'),
        'orders': records(code / 'EnemyOverviewOrders.cs'),
        'mechanics': records(code / 'EnemyOverviewMechanics.cs'),
    }
    OUT.mkdir(exist_ok=True)
    (OUT / 'enemy_notes.json').write_text(json.dumps(notes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    shutil.copyfile(src / 'CardControl.scores.tsv', OUT / 'card_ratings.tsv')
    print(f"{len(rows)} enemies, {len(notes['actions'])} move sets, {len(notes['orders'])} orders, "
          f"{len(notes['mechanics'])} mechanics")


if __name__ == '__main__':
    main()
