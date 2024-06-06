import { Entity, GameData, Ground, Item, ItemKey } from "./enums";

export function initializeGame() {
    const max_world_size = 3;

    const gameData: GameData = {
        time: 0.0,
        communication: {
            running: false,
            stop_running: false,
            error: null,
        },
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
        // field: Array(max_world_size * max_world_size).fill({
        //     type: Entity.HAY.identifier,
        //     growth: 0.0,
        //     water: 0.0,
        //     ground: Ground.DIRT.identifier,
        //     measure: null,
        // }),
        field: [
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
            { type: Entity.PUMPKIN.identifier, growth: 1.0, water: 0.0, ground: Ground.DIRT.identifier, measure: null },
        ],
        // Initial inventory = 0 for all items
        inventory: Object.fromEntries(Object.keys(Item).map(key => [key as ItemKey, 0])) as Record<ItemKey, number>,
        unlocks: {
            speed: 1,
            expand: 1,
            plant: 0,
            hey: 1,
            tree: 0,
            carrot: 0,
            pumpkin: 0,
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myWindow = window as any;
    myWindow.game_data = gameData;
}