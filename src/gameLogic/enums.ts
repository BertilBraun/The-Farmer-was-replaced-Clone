export type ItemType = {
    name: string;
    identifier: ItemKey;
    requirements: [ItemKey, number][];
};

export type EntityType = {
    name: string;
    identifier: EntityKey;
    requirements: ItemType[];
    tilledRequired: boolean;
    growthRate: number;
};

export type GroundType = {
    name: string;
    identifier: GroundKey;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function identifier(name: string): any {
    return name.toUpperCase().replace(' ', '_');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createItemType(name: string, requirements: [any, number][] = []): ItemType {
    // Ensure that the requirements are valid ItemKey, number pairs
    return { name, identifier: identifier(name), requirements };
}

function createEntityType(
    name: string,
    growthRate: number,
    requirements: ItemType[] = [],
    tilledRequired: boolean = false,
): EntityType {
    return { name, identifier: identifier(name), requirements, tilledRequired, growthRate };
}

function createGroundType(name: string): GroundType {
    return { name, identifier: identifier(name) };
}

// Enum Definitions
export const Item = {
    HAY: createItemType('Hay'),
    WOOD: createItemType('Wood'),
    CARROT: createItemType('Carrot'),
    CARROT_SEED: createItemType('Carrot Seed', [['WOOD', 1], ['HAY', 1]]),
    PUMPKIN: createItemType('Pumpkin'),
    PUMPKIN_SEED: createItemType('Pumpkin Seed', [['CARROT', 2]]),
    EMPTY_BUCKET: createItemType('Empty Bucket', [['WOOD', 5]]),
    FULL_BUCKET: createItemType('Full Bucket'),
    FERTILIZER: createItemType('Fertilizer', [['PUMPKIN', 10]]),
    SUNFLOWER_SEED: createItemType('Sunflower Seed', [['CARROT', 5]]),
    POWER: createItemType('Power'),
    CACTUS_SEED: createItemType('Cactus Seed', [['POWER', 5]]),
    CACTUS: createItemType('Cactus'),
} as const;

export type ItemKey = keyof typeof Item;

export const Entity = {
    NOTHING: createEntityType('Nothing', 0.0),
    HAY: createEntityType('Hay', 0.5),
    BUSH: createEntityType('Bush', 0.35),
    TREE: createEntityType('Tree', 0.1),
    CARROT: createEntityType('Carrot', 0.25, [Item.CARROT_SEED], true),
    PUMPKIN: createEntityType('Pumpkin', 0.2, [Item.PUMPKIN_SEED], true),
    SUNFLOWER: createEntityType('Sunflower', 0.3, [Item.SUNFLOWER_SEED], true),
    CACTUS: createEntityType('Cactus', 0.3, [Item.CACTUS_SEED], true),
} as const;

export type EntityKey = keyof typeof Entity;

export const Ground = {
    DIRT: createGroundType('Dirt'),
    TILLED: createGroundType('Tilled'),
} as const;

export type GroundKey = keyof typeof Ground;

export type FieldEntry = {
    type: EntityKey;
    growth: number;
    water: number;
    ground: GroundKey;
    measure: number; // -1 for no measure
};

export type GameData = {
    time: number;
    communication: {
        running: boolean;
        stop_running: boolean;
        error: string | null;
    };
    settings: {
        speedup: number;
        max_world_size: number;
        current_world_size: number;
    };
    drone: {
        position: [number, number];
        last_position: [number, number];
    };
    field: FieldEntry[];
    inventory: {
        [key in ItemKey]: number;
    };
    unlocks: {
        speed: number;
        expand: number;
        plant: number;
        hey: number;
        tree: number;
        carrot: number;
        pumpkin: number;
    };
};
