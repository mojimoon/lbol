"""Load config tables and export images from the game's Unity files."""
import re
from pathlib import Path

import UnityPy

CARD_MAX_SIDE = 640
PORTRAIT_MAX_SIDE = 1400
# Sprite sheets (resources.assets) -> output name prefix. Sheet sprites are the game's own text icons.
SHEETS = {'ManaSprite': '', 'ManaSprite2': '', 'BaseManaSprite': 'b_', 'Point': 'pt_', 'TextIcon': 'icon_'}


def _load(path):
    env = UnityPy.load(Path(path).as_posix())
    if not env.objects:
        raise RuntimeError(f'no objects loaded from {path}')
    return env


def read_config_bytes(data_dir):
    """{'CardConfig': bytes, ...} from resources.assets."""
    out = {}
    for obj in _load(Path(data_dir) / 'resources.assets').objects:
        if obj.type.name == 'TextAsset' and obj.peek_name().endswith('Config'):
            asset = obj.read()
            script = asset.m_Script
            out[asset.m_Name] = script.encode('utf-8', 'surrogateescape') if isinstance(script, str) else bytes(script)
    return out


def _save(image, path, max_side=None, quality=82):
    if max_side and max(image.size) > max_side:
        ratio = max_side / max(image.size)
        image = image.resize((round(image.width * ratio), round(image.height * ratio)))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', quality=quality, method=6)


def safe_name(name):
    return re.sub(r'[^\w.-]', '_', name)


def export_bundle(bundle, wanted, out_dir, force=False, max_side=None, quality=82):
    """wanted: {asset name: output file stem}. Returns asset names not found in the bundle."""
    out_dir = Path(out_dir)
    objects = {}
    # Sprites win over Texture2D: they apply the rect the game actually displays.
    for obj in _load(bundle).objects:
        if obj.type.name in ('Sprite', 'Texture2D'):
            name = obj.peek_name()
            if name in wanted and (name not in objects or obj.type.name == 'Sprite'):
                objects[name] = obj
    for name, obj in objects.items():
        path = out_dir / f'{wanted[name]}.webp'
        if force or not path.exists():
            _save(obj.read().image, path, max_side, quality)
    return sorted(set(wanted) - set(objects))


def export_mana_icons(data_dir, out_dir, force=False):
    out_dir = Path(out_dir)
    env = _load(Path(data_dir) / 'resources.assets')
    textures = {o.path_id: o.peek_name() for o in env.objects if o.type.name == 'Texture2D'}
    wanted_tex = {pid for pid, name in textures.items() if name in SHEETS}
    count = 0
    for obj in env.objects:
        if obj.type.name != 'Sprite':
            continue
        sprite = obj.read()
        pid = sprite.m_RD.texture.path_id
        if pid not in wanted_tex:
            continue
        name = sprite.m_Name
        # ManaSprite's M/P/A variants are battle-UI button states, not text icons.
        if textures[pid] == 'ManaSprite' and re.fullmatch(r'[WUBRGCP](M|P|MA|PA)', name):
            continue
        path = out_dir / f'{SHEETS[textures[pid]]}{name}.webp'
        if force or not path.exists():
            _save(sprite.image, path, 96, 90)
        count += 1
    return count
