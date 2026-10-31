"""Binary readers for the game's ConfigData tables.

Field order mirrors each `*Config.Load()` in LBoL.ConfigData.dll. A game update
that changes a schema trips the "leftover bytes" check in read_table().
"""
import io
import struct

MANA_FIELDS = ('Any', 'W', 'U', 'B', 'R', 'G', 'C', 'P', 'Hybrid', 'HybridColor')
# Enum order: LBoL.Base.ManaColor. 'Any' (0) and 'Hybrid' (8) never appear as a card colour.
MANA_COLOR = ['Any', 'W', 'U', 'B', 'R', 'G', 'C', 'P', 'H']
HYBRID_NAMES = ['HWU', 'HWB', 'HWR', 'HWG', 'HUB', 'HUR', 'HUG', 'HBR', 'HBG', 'HRG']
RARITY = ['Common', 'Uncommon', 'Rare', 'Shining', 'Mythic']
CARD_TYPE = ['Unknown', 'Attack', 'Defense', 'Skill', 'Ability', 'Friend', 'Tool', 'Status', 'Misfortune']
APPEARANCE = ['Anywhere', 'ShopOnly', 'NonShop', 'Nowhere']

# (name, bit, auto_append): LBoL.Base.Keyword. auto_append keywords are printed
# after a card's description; the rest only appear inside the text itself.
KEYWORDS = [
    ('Basic', 1, False), ('Yinyang', 2, False), ('Ability', 4, False), ('Misfortune', 8, False),
    ('Unremovable', 16, True), ('Tool', 32, True), ('Gadgets', 64, False), ('Copy', 128, True),
    ('Accuracy', 256, True), ('Block', 512, False), ('Shield', 1024, False), ('Philosophy', 2048, False),
    ('HybridCost', 4096, False), ('Upgrade', 8192, False), ('Power', 16384, False), ('Forbidden', 32768, True),
    ('Exile', 65536, True), ('Echo', 131072, True), ('EternalEcho', 262144, True), ('Ethereal', 524288, True),
    ('Initial', 1048576, True), ('Retain', 2097152, True), ('TempRetain', 4194304, True),
    ('Replenish', 8388608, True), ('Purified', 16777216, True), ('AutoExile', 33554432, True),
    ('FollowCard', 67108864, True), ('DreamCard', 134217728, True), ('Debut', 268435456, False),
    ('Instinct', 536870912, False), ('XCost', 1073741824, False), ('Synergy', 2147483648, False),
    ('Scry', 68719476736, False), ('Purify', 137438953472, False), ('Expel', 274877906944, False),
    ('Morph', 549755813888, False), ('TempMorph', 1099511627776, False), ('Overdrive', 2199023255552, False),
    ('Grow', 4398046511104, False), ('Plentiful', 8796093022208, False), ('Overdraft', 17592186044416, False),
    ('CopyHint', 35184372088832, False), ('Battlefield', 70368744177664, False),
    ('NaturalTurn', 140737488355328, False), ('FriendCard', 281474976710656, False),
    ('Friend', 562949953421312, False), ('FriendSummoned', 1125899906842624, False),
    ('Loyalty', 2251799813685248, False), ('Mood', 4503599627370496, False),
    ('FollowAttack', 9007199254740992, False), ('Dream', 18014398509481984, False),
    ('Deploy', 72057594037927936, False), ('Promote', 144115188075855872, False),
    ('Kicker', 288230376151711744, False), ('Disposable', 4611686018427387904, True),
]


class Reader:
    def __init__(self, data):
        self.f = io.BytesIO(data)

    def i32(self):
        return struct.unpack('<i', self.f.read(4))[0]

    def keyword(self):
        return struct.unpack('<Q', self.f.read(8))[0]

    def bool(self):
        return self.f.read(1)[0] != 0

    def str(self):
        if not self.bool():
            return None
        length = shift = 0  # .NET BinaryWriter 7-bit encoded length
        while True:
            byte = self.f.read(1)[0]
            length |= (byte & 127) << shift
            shift += 7
            if byte < 128:
                break
        return self.f.read(length).decode('utf-8')

    def mana(self):
        return dict(zip(MANA_FIELDS, (self.i32() for _ in MANA_FIELDS)))

    def list(self, read):
        return [read() for _ in range(self.i32())]

    def opt(self, read):
        return read() if self.bool() else None


def read_table(data, read_row):
    r = Reader(data)
    rows = [read_row(r) for _ in range(r.i32())]
    leftover = len(data) - r.f.tell()
    if leftover:
        raise ValueError(f'{read_row.__name__}: {leftover} bytes left, schema changed?')
    return rows


def _fields(r, spec):
    return {name: read(r) for name, read in spec}


def card(r):
    i32, s, b, m = (lambda _: r.i32()), (lambda _: r.str()), (lambda _: r.bool()), (lambda _: r.mana())
    oi = lambda _: r.opt(r.i32)
    om = lambda _: r.opt(r.mana)
    ls = lambda _: r.list(r.str)
    kw = lambda _: r.keyword()
    return _fields(r, [
        ('Index', i32), ('Id', s), ('Order', i32), ('AutoPerform', b),
        ('Perform', lambda _: r.list(lambda: r.list(r.str))), ('GunName', s), ('GunNameBurst', s),
        ('DebugLevel', i32), ('Revealable', b), ('IsPooled', b), ('HideMesuem', b), ('FindInBattle', b),
        ('IsUpgradable', b), ('Rarity', i32), ('Type', i32), ('TargetType', oi),
        ('Colors', lambda _: r.list(r.i32)), ('IsXCost', b), ('Cost', m), ('UpgradedCost', om),
        ('Kicker', om), ('UpgradedKicker', om), ('MoneyCost', oi),
        ('Damage', oi), ('UpgradedDamage', oi), ('Block', oi), ('UpgradedBlock', oi),
        ('Shield', oi), ('UpgradedShield', oi), ('Value1', oi), ('UpgradedValue1', oi),
        ('Value2', oi), ('UpgradedValue2', oi), ('Mana', om), ('UpgradedMana', om),
        ('Scry', oi), ('UpgradedScry', oi), ('ToolPlayableTimes', oi), ('Loyalty', oi), ('UpgradedLoyalty', oi),
        ('PassiveCost', oi), ('UpgradedPassiveCost', oi), ('ActiveCost', oi), ('UpgradedActiveCost', oi),
        ('ActiveCost2', oi), ('UpgradedActiveCost2', oi), ('UltimateCost', oi), ('UpgradedUltimateCost', oi),
        ('Keywords', kw), ('UpgradedKeywords', kw), ('EmptyDescription', b),
        ('RelativeKeyword', kw), ('UpgradedRelativeKeyword', kw),
        ('RelativeEffects', ls), ('UpgradedRelativeEffects', ls), ('RelativeCards', ls), ('UpgradedRelativeCards', ls),
        ('Owner', s), ('Pack', s), ('ImageId', s), ('UpgradeImageId', s), ('Unfinished', b),
        ('Illustrator', s), ('SubIllustrator', ls),
    ])


def exhibit(r):
    i32, s, b = (lambda _: r.i32()), (lambda _: r.str()), (lambda _: r.bool())
    oi = lambda _: r.opt(r.i32)
    ls = lambda _: r.list(r.str)
    return _fields(r, [
        ('Index', i32), ('Id', s), ('Order', i32), ('IsDebug', b), ('IsPooled', b), ('IsSentinel', b),
        ('Revealable', b), ('Appearance', i32), ('Owner', s), ('LosableType', i32), ('Rarity', i32),
        ('Value1', oi), ('Value2', oi), ('Value3', oi), ('Mana', lambda _: r.opt(r.mana)),
        ('BaseManaRequirement', oi), ('BaseManaColor', oi), ('BaseManaAmount', i32),
        ('HasCounter', b), ('InitialCounter', oi), ('Keywords', lambda _: r.keyword()),
        ('RelativeEffects', ls), ('RelativeCards', ls),
    ])


def player_unit(r):
    i32, s, b = (lambda _: r.i32()), (lambda _: r.str()), (lambda _: r.bool())
    oi = lambda _: r.opt(r.i32)
    ls = lambda _: r.list(r.str)
    return _fields(r, [
        ('Id', s), ('HasHomeName', b), ('ModleName', s), ('Order', i32), ('ShowOrder', i32), ('UnlockLevel', oi),
        ('IsSelectable', b), ('BasicRingOrder', oi), ('LeftColor', i32), ('RightColor', i32),
        ('InitialMana', lambda _: r.mana()), ('NarrativeColor', s), ('MaxHp', i32), ('InitialMoney', i32),
        ('InitialPower', i32), ('UltimateSkillA', s), ('UltimateSkillB', s), ('ExhibitA', s), ('ExhibitB', s),
        ('DeckA', ls), ('DeckB', ls), ('DifficultyA', i32), ('DifficultyB', i32),
    ])


def ultimate_skill(r):
    i32 = lambda _: r.i32()
    ls = lambda _: r.list(r.str)
    return _fields(r, [
        ('Id', lambda _: r.str()), ('Order', i32), ('PowerCost', i32), ('PowerPerLevel', i32), ('MaxPowerLevel', i32),
        ('RepeatableType', i32), ('Damage', i32), ('Value1', i32), ('Value2', i32),
        ('Keywords', lambda _: r.keyword()), ('RelativeEffects', ls), ('RelativeCards', ls),
    ])


def status_effect(r):
    i32, s, b = (lambda _: r.i32()), (lambda _: r.str()), (lambda _: r.bool())
    oi = lambda _: r.opt(r.i32)
    return _fields(r, [
        ('Index', i32), ('Id', s), ('Order', i32), ('Type', i32), ('IsVerbose', b), ('IsStackable', b),
        ('StackActionTriggerLevel', oi), ('HasLevel', b), ('LevelStackType', oi), ('HasDuration', b),
        ('DurationStackType', oi), ('DurationDecreaseTiming', i32), ('HasCount', b), ('CountStackType', oi),
        ('LimitStackType', oi), ('ShowPlusByLimit', b), ('Keywords', lambda _: r.keyword()),
        ('RelativeEffects', lambda _: r.list(r.str)), ('ImageId', s), ('VFX', s), ('VFXloop', s), ('SFX', s),
    ])
