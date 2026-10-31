"""Description placeholders that live in C# (LBoL.EntityLib), not in config.

Hand-read from the decompiled card classes, so re-check after a game update. Each
entry maps placeholder -> constant | (normal, upgraded) | callable(get). `get(key)`
reads the card's config values. Anything not listed resolves to a battle-only value;
build.py lists those in reports/dynamic_placeholders.md.
"""
from richtext import Mana


def mana(**kw):
    return Mana({'Any': 0, 'W': 0, 'U': 0, 'B': 0, 'R': 0, 'G': 0, 'C': 0, 'P': 0, 'Hybrid': 0, 'HybridColor': 0, **kw})


def _scale(group, n):
    return Mana({k: (v if k == 'HybridColor' else v * n) for k, v in group.items()})


GLOBAL = {
    'FreezeTimes': 1,  # ManaFreezer.InitialTimes; no subclass overrides it
}

BY_CARD = {
    'RedLaser': {'AttackTimes': 2, 'UpgradeDamage': lambda g: g('UpgradedDamage') or g('Damage')},
    'ShootMoon': {'AttackTimes': 2},
    'PatchouliFriend': {'PassiveColor': lambda g: g('PassiveCost'), 'Power': (3, 5)},
    'Knife': {'DropDamage': lambda g: g('Value1')},
    'MeilingFriend': {'Graze': (1, 2)},
    'LilyFriend': {'ActiveMana': (mana(U=1, G=2), mana(P=1, G=2)), 'Heal': (6, 8), 'TurnMana': lambda g: g('Mana')},
    'GatherFairy': {'MaxHand': 12},
    'StarFriend': {'Light': 1},
    'SunnyFriend': {'Light': 1},
    'PrismriverWhite': {'Light': 1},
    'PrismriverBlack': {'Light': 1},
    'PrismriverRed': {'Light': 2},
    'ClownpieceFriend': {'StartMana': mana(P=3)},
    'KoishiUltimateToken': {'TotalMana': lambda g: _scale(g('Mana'), g('Value2'))},
    'PsycheLock': {'Count': 3},  # 3 - moods gained; 3 before any battle event
    'LunaticPassion': {'Percentage': 150},
    'SuikaBigball': {'HalfDamage': lambda g: int(g('Damage') * 0.5)},
    'LimaoAttack': {'GainMana': lambda g: g('Mana')},  # Mana * (GrowCount + 1), GrowCount starts at 0
}

ULTIMATE = {
    'CirnoUltG': {'GainMana': mana(P=1), 'Mana': mana(P=1)},
    'ReimuUltW': {'Shield': lambda skill: skill['Value2']},
}

# Out-of-run defaults of each status effect's Value property.
STATUS = {
    'Weak': {'Value': 30},
    'Vulnerable': {'Value': 50},
    'Fragil': {'Value': 30},
}
