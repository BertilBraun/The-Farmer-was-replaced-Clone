
export const gameLibraryFunctionsWithParams = ['delay', 'move', 'measure', 'harvest', 'plant', 'trade', 'use_item', 'num_items', 'swap'];
export const gameLibraryFunctionsWithoutParams = ['get_pos_x', 'get_pos_y', 'get_world_size', 'get_water', 'can_harvest', 'till'];

export const allowedStdLibFunctions = [
    'print',
    'bool',
    'float',
    'int',
    'list',
    'map',
    'range',
    'set',
    'str',
    'tuple',
    'abs',
    'all',
    'any',
    'chr',
    'dict',
    'divmod',
    'enumerate',
    'filter',
    'hash',
    'hex',
    'len',
    'max',
    'min',
    'ord',
    'pow',
    'reversed',
    'round',
    'slice',
    'sorted',
    'sum',
    'zip',
    'time',
    'random',
    'choice',
];

export const allowedTypes = [
    "bool", "float", "int", "list",
    "map", "range", "set", "str", "tuple"
];


function getLibraryFunctions(gameLogicCode) {
    const functionRegex = /async def ([a-zA-Z]\w*)\(/g;
    let match;
    const library = [];

    while ((match = functionRegex.exec(gameLogicCode)) !== null) {
        library.push(match[1]);
    }

    return library;
}

export const processCode = async (code) => {
    if (code.includes('"""') || code.includes("'''")) {
        alert('Triple quotes are not allowed in the code');
        return;
    }

    // Game logic is loaded from /gameLogic.py
    const gameLogic = await (await fetch('/gameLogic.py')).text();
    // Game logic is loaded from /appLogic.py
    const appLogic = await (await fetch('/appLogic.py')).text();

    const currentLibrary = getLibraryFunctions(gameLogic);
    // Check if the code uses any functions that are not in the game logic
    for (const func of currentLibrary) {
        if (!gameLibraryFunctionsWithParams.includes(func) && !gameLibraryFunctionsWithoutParams.includes(func)) {
            alert(`Function ${func} is not mapped in the game logic`);
            return;
        }
    }

    const libraryFunctions = currentLibrary.map(f => `"${f}"`).join(', ');
    const allowedFunctions = currentLibrary.concat(allowedStdLibFunctions).concat(allowedTypes).map(f => `"${f}"`).join(', ');

    return appLogic
        .replace('{GAME_LOGIC}', gameLogic)
        .replace('{USER_CODE}', code)
        .replace("'{LIBRARY_FUNCTIONS}'", libraryFunctions)
        .replace("'{ALLOWED_FUNCTIONS}'", allowedFunctions);
}



export const Item = {
    HAY: ['Hay', []],
    WOOD: ['Wood', []],
    CARROT: ['Carrot', []],
    CARROT_SEED: ['Carrot Seed', [['WOOD', 1], ['HAY', 1]]],
    PUMPKIN: ['Pumpkin', []],
    PUMPKIN_SEED: ['Pumpkin Seed', [['CARROT', 2]]],
    EMPTY_BUCKET: ['Empty Bucket', [['WOOD', 5]]],
    FULL_BUCKET: ['Full Bucket', []],
    FERTILIZER: ['Fertilizer', [['PUMPKIN', 10]]],
    SUNFLOWER_SEED: ['Sunflower Seed', [['CARROT', 5]]],
    POWER: ['Power', []],
    CACTUS_SEED: ['Cactus Seed', [['POWER', 5]]],
    CACTUS: ['Cactus', []],
};

export const Entity = {
    NOTHING: ['Nothing', [], false, 0],
    HAY: ['Hay', [], false, 0.5],
    BUSH: ['Bush', [], false, 0.35],
    TREE: ['Tree', [], false, 0.1],
    CARROT: ['Carrot', [Item.CARROT_SEED], true, 0.25],
    PUMPKIN: ['Pumpkin', [Item.PUMPKIN_SEED], true, 0.2],
    SUNFLOWER: ['Sunflower', [Item.SUNFLOWER_SEED], true, 0.3],
    CACTUS: ['Cactus', [Item.CACTUS_SEED], true, 0.3],
};

export const Ground = {
    DIRT: 'Dirt',
    TILLED: 'Tilled',
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Settings class
export class Settings {
    static get speedup() {
        return window.game_data.settings.speedup;
    }

    static get max_world_size() {
        return window.game_data.settings.max_world_size;
    }

    static get current_world_size() {
        return window.game_data.settings.current_world_size;
    }

    static get total_play_time() {
        return window.game_data.time;
    }
}

// Drone class
export class Drone {
    static get position() {
        return window.game_data.drone.position;
    }

    static set position(value) {
        if (value.length !== 2) throw new Error('Position must be a list of two integers');
        if (value[0] < 0 || value[0] >= Settings.current_world_size || value[1] < 0 || value[1] >= Settings.current_world_size) {
            throw new Error('Position out of bounds');
        }
        window.game_data.drone.last_position = Drone.position;
        window.game_data.drone.position = value;
    }

    static get last_position() {
        return window.game_data.drone.last_position;
    }
}

// Field class
export class Field {
    static _get(x, y) {
        if (x < 0 || x >= Settings.current_world_size || y < 0 || y >= Settings.current_world_size) {
            throw new Error('Coordinates out of bounds');
        }
        const index = Settings.max_world_size * y + x;
        return window.game_data.field[index];
    }

    static get_type(x, y) {
        const str_name = Field._get(x, y).type;
        for (const entity in Entity) {
            if (Entity[entity][0].startsWith(str_name)) {
                return entity;
            }
        }
        throw new Error(`Invalid entity name: ${str_name}`);
    }

    static set_type(x, y, entity) {
        Field._get(x, y).type = entity[0];
    }

    static get_ground(x, y) {
        const str_name = Field._get(x, y).ground;
        for (const ground in Ground) {
            if (Ground[ground].startsWith(str_name)) {
                return ground;
            }
        }
        throw new Error(`Invalid ground name: ${str_name}`);
    }

    static set_ground(x, y, ground) {
        Field._get(x, y).ground = ground;
    }

    static get_growth(x, y) {
        return clamp(Field._get(x, y).growth, 0.0, 1.0);
    }

    static set_growth(x, y, growth) {
        Field._get(x, y).growth = growth;
    }

    static get_water(x, y) {
        return clamp(Field._get(x, y).water, 0.0, 1.0);
    }

    static set_water(x, y, water) {
        Field._get(x, y).water = water;
    }

    static get_measure(x, y) {
        return Field._get(x, y).measure;
    }

    static set_measure(x, y, measure) {
        Field._get(x, y).measure = measure;
    }
}

// Inventory class
export class Inventory {
    static get(item) {
        return window.game_data.inventory[item[0]];
    }

    static set(item, value) {
        window.game_data.inventory[item[0]] = value;
    }

    static add(item, value) {
        Inventory.set(item, Inventory.get(item) + value);
    }

    static remove(item, value) {
        Inventory.set(item, Inventory.get(item) - value);
    }
}


export function initializeGame() {
    const max_world_size = 3;

    window.game_data = {
        time: 0.0,
        settings: {
            speedup: 1,
            max_world_size: max_world_size,
            current_world_size: 3,
        },
        drone: {
            position: [0, 0],
            last_position: [0, 0],
        },
        // Initial field = max_world_size * max_world_size with HAY, DIRT, 0.0 water, 0.0 growth
        field2: Array(max_world_size * max_world_size).fill({
            'type': Entity.HAY[0],
            'growth': 0.0,
            'water': 0.0,
            'ground': Ground.DIRT[0],
            'measure': null,
        }),
        field: [
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
            { 'type': Entity.PUMPKIN[0], 'growth': 1.0, 'water': 0.0, 'ground': Ground.DIRT, 'measure': null },
        ],
        // Initial inventory = 0 for all items. Item.value[0] is the name of the item
        inventory: Object.fromEntries(Object.keys(Item).map(key => [Item[key][0], 0])),
        'unlocks': {
            'speed': 1,
            'expand': 1,
            'plant': 0,
            'hey': 1,
            'tree': 0,
            'carrot': 0,
            'pumpkin': 0,
        },
    };
}