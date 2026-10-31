"""Cards that create random cards from a limited range, hand-read from LBoL.EntityLib.

Each entry restates one Battle.RollCards / RollCard call: the CardWeightTable (rarity,
owner, type) and its filter lambda. Re-check after a game update. Left out on purpose:
- "完全随机" cards (ButterflyDream, OutInGap, TimeMagic): the text already gives the range.
- rolls with no limit beyond the whole pool (NueExile, GrimoireStudy, RainbowMarket, FindCollection).
- HuiyeMarblePhantasm: its range depends on X at play time.

Fields: types, rarities (default RarityWeightTable.BattleCard), neutral_only, cost_min, cost_max,
colors_within, color_count, exclude, unlimited (RollCardsWithoutManaLimit).
cost_min may name a config value; the lower of its base and upgraded values applies.
Cards that roll through their status effect are listed under the card (MoreFriends, BailianFire,
BladePower, YukariFriend).
"""

LOOT = ['Attack', 'Defense', 'Skill', 'Ability', 'Friend']  # CardTypeWeightTable.CanBeLoot
BATTLE = ['Common', 'Uncommon', 'Rare']  # RarityWeightTable.BattleCard: Shining and Mythic weigh 0

ROLLS = {
    'CallFriends': {'types': ['Friend'], 'cost_max': 4},
    'ChooseFriend': {'types': ['Friend'], 'cost_max': 4, 'unlimited': True},
    'MoreFriends': {'types': ['Friend'], 'cost_max': 4},
    'PlayWithWaste': {'types': ['Tool'], 'rarities': ['Common', 'Uncommon']},
    'ToolRandomTool': {'types': ['Tool']},
    'KoishiTouying': {'types': LOOT, 'cost_min': 'Value2'},
    'HuanxiangTouying': {'types': LOOT, 'cost_min': 1, 'cost_max': 3},
    'MojingShanjie': {'types': ['Defense']},
    'OverJingjie': {'types': ['Attack']},
    'BladePower': {'types': ['Attack']},
    'BailianFire': {'types': ['Skill']},
    'HappyNewYear': {'types': ['Attack', 'Defense']},
    'ZoufangSnake': {'types': ['Ability'], 'rarities': ['Rare'], 'neutral_only': True, 'unlimited': True},
    'YukariFriend': {'types': LOOT, 'rarities': ['Rare'], 'neutral_only': True, 'color_count': 3,
                     'exclude': ['YukariFriend'], 'unlimited': True},
    'ReadBook': {'types': LOOT, 'colors_within': ['W', 'U']},
    'YijiFirepower': {'types': ['Attack'], 'rarities': ['Common']},
    'LilyChun': {'types': LOOT, 'cost_min': 1, 'cost_max': 1, 'exclude': ['LilyChun']},
    'PatchouliLibrary': {'types': LOOT, 'rarities': ['Rare', 'Uncommon']},
    'LanCard': {'types': LOOT, 'rarities': ['Uncommon'], 'cost_max': 5},
    'BailianNingshen': {'types': LOOT, 'rarities': ['Common']},
}


def roll_spec(card):
    """The frontend's form of a card's roll, or None if it has no limited roll."""
    spec = ROLLS.get(card['Id'])
    if spec is None:
        return None
    spec = {'rarities': BATTLE, **spec}
    if isinstance(spec.get('cost_min'), str):
        key = spec['cost_min']
        spec['cost_min'] = min(v for v in (card[key], card[f'Upgraded{key}']) if v is not None)
    return spec
