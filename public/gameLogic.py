import random
from enum import Enum
from math import floor
from time import time
from typing import Iterable

from browser import aio, window

__DEFAULT_NUM_OPERATIONS = 200
__WATER_DECAY_RATE_PER_SECOND = 0.04
__BUCKET_FILL_PERCENTAGE_PER_SECOND = 0.05
__MAX_WATER_SPEEDUP = 5
__POWER_DECAY_RATE_PER_OPERATION = 0.00002
__WATER_BUCKET_FILL_RATE = 0.25


# All functions in this file are meant to be used in the user's code.
# The game data is stored in the window object, so it can be accessed and modified from both python and JS.


class Direction(Enum):
    # IDENTIFIER = 'Name', (dx, dy)
    NORTH = 'North', (0, 1)
    EAST = 'East', (1, 0)
    SOUTH = 'South', (0, -1)
    WEST = 'West', (-1, 0)


North = Direction.NORTH
East = Direction.EAST
South = Direction.SOUTH
West = Direction.WEST


class Item(Enum):
    # IDENTIFIER = 'Name', [(Required Item, Quantity), ...]
    HAY = 'Hay', []
    WOOD = 'Wood', []
    CARROT = 'Carrot', []
    CARROT_SEED = 'Carrot Seed', [('WOOD', 1), ('HAY', 1)]
    PUMPKIN = 'Pumpkin', []
    PUMPKIN_SEED = 'Pumpkin Seed', [('CARROT', 2)]
    EMPTY_BUCKET = 'Empty Bucket', [('WOOD', 5)]
    FULL_BUCKET = 'Full Bucket', []
    FERTILIZER = 'Fertilizer', [('PUMPKIN', 10)]
    SUNFLOWER_SEED = 'Sunflower Seed', [('CARROT', 5)]
    POWER = 'Power', []
    CACTUS_SEED = 'Cactus Seed', [('POWER', 5)]
    CACTUS = 'Cactus', []

    @property
    def required_items(self) -> list[tuple['Item', int]]:
        return [(__get_item_from_identifier(item), count) for item, count in self.value[1]]


__USABLE_ITEMS = [Item.FULL_BUCKET, Item.FERTILIZER]


class Entity(Enum):
    # IDENTIFIER = 'Name', [Required Item, ...], tilled_required, growth_rate, measure_data
    NOTHING = 'Nothing', [], False, 0, None
    HAY = 'Hay', [], False, 0.5, None
    BUSH = 'Bush', [], False, 0.35, None
    TREE = 'Tree', [], False, 0.1, None
    CARROT = 'Carrot', [Item.CARROT_SEED], True, 0.25, None
    PUMPKIN = 'Pumpkin', [Item.PUMPKIN_SEED], True, 0.2, None
    SUNFLOWER = 'Sunflower', [Item.SUNFLOWER_SEED], True, 0.3, list(range(1, 17))
    CACTUS = 'Cactus', [Item.CACTUS_SEED], True, 0.3, list(range(1, 11))


__ENTITY_TO_ITEM = {
    Entity.HAY: Item.HAY,
    Entity.BUSH: Item.WOOD,
    Entity.TREE: Item.WOOD,
    Entity.CARROT: Item.CARROT,
    Entity.PUMPKIN: Item.PUMPKIN,
    Entity.SUNFLOWER: Item.POWER,
    Entity.CACTUS: Item.CACTUS,
}


class Ground(Enum):
    DIRT = 'Dirt'
    TILLED = 'Tilled'


def __get_entity_from_identifier(identifier: str) -> Entity:
    for entity in Entity:
        if entity.name == identifier:
            return entity
    raise ValueError(f'Invalid entity name: {identifier}')


def __get_item_from_identifier(identifier: str) -> Item:
    for item in Item:
        if item.name == identifier:
            return item
    raise ValueError(f'Invalid item name: {identifier}')


def __get_ground_from_identifier(identifier: str) -> Ground:
    for ground in Ground:
        if ground.name == identifier:
            return ground
    raise ValueError(f'Invalid ground name: {identifier}')


class __Settings:
    @classmethod
    @property
    def speedup(cls) -> int:
        return window.game_data['settings']['speedup']

    @classmethod
    @property
    def max_world_size(cls) -> int:
        return window.game_data['settings']['max_world_size']

    @classmethod
    @property
    def current_world_size(cls) -> int:
        return window.game_data['settings']['current_world_size']


class __Drone:
    @classmethod
    @property
    def position(cls) -> list[int]:
        return window.game_data['drone']['position']

    @staticmethod
    def set_position(value: list[int]) -> None:
        assert len(value) == 2
        assert 0 <= value[0] < __Settings.current_world_size
        assert 0 <= value[1] < __Settings.current_world_size
        window.game_data['drone']['last_position'] = __Drone.position
        window.game_data['drone']['position'] = value

    @classmethod
    @property
    def last_position(cls) -> list[int]:
        return window.game_data['drone']['last_position']


class __Field:
    @staticmethod
    def _get(x: int, y: int):
        assert 0 <= x < __Settings.current_world_size
        assert 0 <= y < __Settings.current_world_size
        index = __Settings.max_world_size * y + x
        return window.game_data['field'][index]

    @staticmethod
    def get_type(x: int, y: int) -> Entity:
        return __get_entity_from_identifier(__Field._get(x, y)['type'])

    @staticmethod
    def set_type(x: int, y: int, entity: Entity) -> None:
        __Field._get(x, y)['type'] = entity.name

    @staticmethod
    def get_ground(x: int, y: int) -> Ground:
        return __get_ground_from_identifier(__Field._get(x, y)['ground'])

    @staticmethod
    def set_ground(x: int, y: int, ground: Ground) -> None:
        __Field._get(x, y)['ground'] = ground.name

    @staticmethod
    def get_growth(x: int, y: int) -> float:
        return min(1, max(0, __Field._get(x, y)['growth']))

    @staticmethod
    def set_growth(x: int, y: int, growth: float) -> None:
        __Field._get(x, y)['growth'] = growth

    @staticmethod
    def get_water(x: int, y: int) -> float:
        return min(1, max(0, __Field._get(x, y)['water']))

    @staticmethod
    def set_water(x: int, y: int, water: float) -> None:
        __Field._get(x, y)['water'] = water

    @staticmethod
    def get_measure(x: int, y: int):
        return __Field._get(x, y)['measure']

    @staticmethod
    def set_measure(x: int, y: int, measure) -> None:
        __Field._get(x, y)['measure'] = measure


class __Inventory:
    @staticmethod
    def get(item: Item) -> float:
        return window.game_data['inventory'][item.name]

    @staticmethod
    def set(item: Item, value: float) -> None:
        window.game_data['inventory'][item.name] = value

    @staticmethod
    def add(item: Item, value: float) -> None:
        __Inventory.set(item, __Inventory.get(item) + value)

    @staticmethod
    def remove(item: Item, value: float) -> None:
        __Inventory.set(item, __Inventory.get(item) - value)


# window.game_data = {
#     'unlocks': {
#         'speed': 1,
#         'expand': 1,
#         'plant': 0,
#         'hey': 1,
#         'tree': 0,
#         'carrot': 0,
#         'pumpkin': 0,
#     }
# }


__last_update_time = time()
__last_bucket_fill_time = time()


async def delay(time_in_seconds: float) -> None:
    await aio.sleep(time_in_seconds)


def __calculate_delay_time_for_operations(num_operations: int) -> float:
    speedup = __Settings.speedup
    if __Inventory.get(Item.POWER) > 0:
        # if the inventory contains power, the speedup is 2x
        speedup *= 2
    return num_operations / (1000 * speedup)


async def __system(num_operations=__DEFAULT_NUM_OPERATIONS) -> None:
    if window.game_data.communication.stop_running:
        raise Exception('Stopping execution')

    global __last_update_time
    delta_time = time() - __last_update_time
    if delta_time > 1 / 60:
        __last_update_time = time()

        window.game_data['time'] += delta_time

        for x in range(__Settings.current_world_size):
            for y in range(__Settings.current_world_size):
                __update_field(x, y, delta_time)

        __fill_buckets()

    __remove_power(num_operations)
    sleep_time = __calculate_delay_time_for_operations(num_operations)
    await delay(sleep_time)


def __fill_buckets() -> None:
    global __last_bucket_fill_time
    # Fill 5% of the empty buckets with water every second
    time_since_last_fill = time() - __last_bucket_fill_time
    buckets_to_fill = int(time_since_last_fill * __BUCKET_FILL_PERCENTAGE_PER_SECOND)
    __last_bucket_fill_time += buckets_to_fill / __BUCKET_FILL_PERCENTAGE_PER_SECOND
    __Inventory.add(Item.FULL_BUCKET, buckets_to_fill)
    __Inventory.remove(Item.EMPTY_BUCKET, buckets_to_fill)


def __remove_power(num_operations: int) -> None:
    # remove a bit of power for each operation
    power_to_remove = num_operations * __POWER_DECAY_RATE_PER_OPERATION
    __Inventory.set(Item.POWER, max(0, __Inventory.get(Item.POWER) - power_to_remove))


def __update_field(x: int, y: int, delta_time: float) -> None:
    entity = __Field.get_type(x, y)

    if entity != Entity.NOTHING:
        water_level = __Field.get_water(x, y)
        growth_rate = entity.value[3] * (__MAX_WATER_SPEEDUP * water_level + 1)

        if entity == Entity.TREE:
            # Trees grow slower if there are trees around
            for dir in Direction:
                nx, ny = __position_in_direction(x, y, dir)
                if __Field.get_type(nx, ny) == Entity.TREE:
                    growth_rate *= 0.5

        __Field.set_growth(x, y, __Field.get_growth(x, y) + growth_rate * delta_time)

    # decay water level
    water_decay = __WATER_DECAY_RATE_PER_SECOND * __Field.get_water(x, y) * delta_time
    __Field.set_water(x, y, __Field.get_water(x, y) - water_decay)


def __position_in_direction(x: int, y: int, dir: Direction) -> tuple[int, int]:
    dx, dy = dir.value[1]
    nx = (x + dx + __Settings.current_world_size) % __Settings.current_world_size
    ny = (y + dy + __Settings.current_world_size) % __Settings.current_world_size
    return nx, ny


async def get_pos_x() -> int:
    return __Drone.position[0]


async def get_pos_y() -> int:
    return __Drone.position[1]


async def get_world_size() -> int:
    return __Settings.current_world_size


async def move(dir: Direction) -> bool:
    x, y = __Drone.position
    nx, ny = __position_in_direction(x, y, dir)

    is_wall_between = False  # TODO check if there is a wall between the current position and the new position
    if is_wall_between:
        await __system(num_operations=1)
        return False

    __Drone.set_position([nx, ny])
    await __system()
    return True


async def measure(dir: Direction | None = None) -> Entity:
    x, y = __Drone.position
    if dir is not None:
        x, y = __position_in_direction(x, y, dir)

    await __system()
    return __Field.get_type(x, y)


async def get_water() -> float:
    x, y = __Drone.position
    await __system()
    return __Field.get_water(x, y)


def __reset_multiple_fields(positions: Iterable[tuple[int, int]]) -> None:
    for pos in positions:
        __reset_field(*pos)


def __reset_field(x: int, y: int) -> None:
    # Clearing the field / resetting growth
    if __Field.get_ground(x, y) == Ground.DIRT:
        __Field.set_type(x, y, Entity.HAY)
    else:
        __Field.set_type(x, y, Entity.NOTHING)
    __Field.set_growth(x, y, 0.0)
    __Field.set_measure(x, y, None)


def __get_pumpkin_coloring() -> dict[tuple[int, int], int]:
    coloring = {}
    y = 0
    while y < __Settings.current_world_size:
        x = 0
        while x < __Settings.current_world_size and y < __Settings.current_world_size:
            # Fill from the current position to the right and top while all cells in the square are pumpkins
            if coloring.get((x, y)) is not None:
                # Already colored with a square
                x += 1
                continue

            color = len(coloring) + 1
            coloring[(x, y)] = color
            if __Field.get_type(x, y) != Entity.PUMPKIN or __Field.get_growth(x, y) < 1:
                x += 1
                continue

            size = 1
            # grow the square
            while x + size < __Settings.current_world_size and y + size < __Settings.current_world_size:
                valid = True
                for i in range(size + 1):
                    if (
                        __Field.get_type(x + size, y + i) != Entity.PUMPKIN
                        or __Field.get_growth(x + size, y + i) < 1
                        or __Field.get_type(x + i, y + size) != Entity.PUMPKIN
                        or __Field.get_growth(x + i, y + size) < 1
                    ):
                        valid = False
                        break
                if valid:
                    for i in range(size + 1):
                        coloring[(x + size, y + i)] = color
                        coloring[(x + i, y + size)] = color
                    size += 1
                else:
                    break
            x += size
        y += 1

    return coloring


def __measure_field_of_type(entity: Entity) -> dict[tuple[int, int], int]:
    measurements = {}
    for x in range(__Settings.current_world_size):
        for y in range(__Settings.current_world_size):
            if __Field.get_type(x, y) == entity and __Field.get_growth(x, y) >= 1:
                measurements[(x, y)] = __Field.get_measure(x, y)
    return measurements


async def harvest() -> bool:
    x, y = __Drone.position
    entity = __Field.get_type(x, y)

    if entity == Entity.NOTHING:
        await __system(num_operations=1)
        return False

    item = __ENTITY_TO_ITEM[entity]
    grown = __Field.get_growth(x, y) >= 1

    if entity == Entity.PUMPKIN and grown:
        # Harvesting pumpkins always harvests the pumpkins in a square and gives the player the side length cubed pumpkins
        coloring = __get_pumpkin_coloring()
        color = coloring[(x, y)]
        num_pumpkins = sum(1 for c in coloring.values() if c == color)
        __Inventory.add(item, int(num_pumpkins**1.5))
        for (nx, ny), c in coloring.items():
            if c == color:
                __reset_field(nx, ny)
    elif entity == Entity.SUNFLOWER and grown:
        # Harvesting sunflowers gives the player power based on the number of sunflowers on the field but
        # only if the current sunflower is the largest
        # otherwise, all sunflowers are reset
        all_sunflowers = __measure_field_of_type(Entity.SUNFLOWER)

        max_sunflower = max(all_sunflowers.values())
        if all_sunflowers[(x, y)] == max_sunflower:
            __Inventory.add(item, len(all_sunflowers))
            __reset_field(x, y)
        else:
            __reset_multiple_fields(all_sunflowers.keys())
    elif entity == Entity.CACTUS and grown:
        # Harvesting cacti gives the player cacti based on the number of cacti on the field but
        # only if the cacti are always sorted from left to right and bottom to top
        # otherwise, all cacti are reset
        all_cacti = __measure_field_of_type(Entity.CACTUS)

        for x, y in all_cacti:
            for nx in range(x, __Settings.current_world_size):
                for ny in range(y, __Settings.current_world_size):
                    if (nx, ny) in all_cacti and all_cacti[(nx, ny)] < all_cacti[(x, y)]:
                        # broken (I.e. not sorted)
                        __reset_multiple_fields(all_cacti.keys())
                        await __system()
                        return True

        __Inventory.add(item, len(all_cacti) ** 2)
        __reset_multiple_fields(all_cacti.keys())
    else:
        # Harvesting
        if grown:
            __Inventory.add(item, 1)
        __reset_field(x, y)

    await __system()
    return True


async def can_harvest() -> bool:
    await __system()
    return __Field.get_growth(*__Drone.position) >= 1


async def plant(entity: Entity) -> bool:
    x, y = __Drone.position
    name, required_items, tilled_required, growth_rate, measure_data = entity.value

    invalid_till_state = tilled_required and __Field.get_ground(x, y) != Ground.TILLED
    not_enough_resources = any(__Inventory.get(item) < 1 for item in required_items)

    if invalid_till_state or not_enough_resources:
        await __system(num_operations=1)
        return False

    for item in required_items:
        __Inventory.remove(item, 1)
    __Field.set_type(x, y, entity)
    __Field.set_growth(x, y, 0.0)
    __Field.set_measure(x, y, None if measure_data is None else random.choice(measure_data))
    await __system()
    return True


async def till():
    x, y = __Drone.position
    if __Field.get_ground(x, y) == Ground.TILLED:
        __Field.set_ground(x, y, Ground.DIRT)
        tilled_required = __Field.get_type(x, y).value[2]
        if tilled_required:
            __Field.set_type(x, y, Entity.NOTHING)
            __Field.set_growth(x, y, 0.0)
    else:
        __Field.set_ground(x, y, Ground.TILLED)
    await __system()


async def trade(item: Item) -> bool:
    not_buyable = not item.required_items  # not buyable if no required items
    not_enough_resources = any(__Inventory.get(item) < count for item, count in item.required_items)

    if not_enough_resources or not_buyable:
        await __system(num_operations=1)
        return False

    __Inventory.add(item, 1)
    for item, count in item.required_items:
        __Inventory.remove(item, count)
    await __system()
    return True


async def use_item(item: Item) -> bool:
    if __Inventory.get(item) < 1 or item not in __USABLE_ITEMS:
        await __system(num_operations=1)
        return False

    x, y = __Drone.position
    if item == Item.FERTILIZER:
        # Grow the plant by 2sec worth of growth
        entity_growth_rate = __Field.get_type(x, y).value[3]
        __Field.set_growth(x, y, __Field.get_growth(x, y) + 2.0 * entity_growth_rate)
    elif item == Item.FULL_BUCKET:
        __Field.set_water(x, y, __Field.get_water(x, y) + __WATER_BUCKET_FILL_RATE)

    __Inventory.remove(item, 1)

    await __system()
    return True


async def swap(direction: Direction) -> bool:
    x, y = __Drone.position
    nx, ny = __position_in_direction(x, y, direction)

    if False:  # TODO if there is a wall between the current position and the new position in a maze
        await __system(num_operations=1)
        return False

    old_type, new_type = __Field.get_type(x, y), __Field.get_type(nx, ny)
    old_growth, new_growth = __Field.get_growth(x, y), __Field.get_growth(nx, ny)
    old_measure, new_measure = __Field.get_measure(x, y), __Field.get_measure(nx, ny)

    __Field.set_type(x, y, new_type)
    __Field.set_type(nx, ny, old_type)
    __Field.set_growth(x, y, new_growth)
    __Field.set_growth(nx, ny, old_growth)
    __Field.set_measure(x, y, new_measure)
    __Field.set_measure(nx, ny, old_measure)

    await __system()
    return True


async def num_items(item: Item) -> int:
    await __system()
    return floor(__Inventory.get(item))


async def _mprint(*args, **kwargs):
    print('My Print', *args, **kwargs)
    await __system(num_operations=500)
