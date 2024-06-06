import { Entity, EntityKey, EntityType, FieldEntry, GameData, Ground, GroundKey, GroundType, ItemKey } from "./enums";

export function game_data(): GameData | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myWindow = window as any;
    return myWindow.game_data;
}

export function set_game_data(data: GameData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myWindow = window as any;
    myWindow.game_data = data;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

// Settings class
export class Settings {
    static get speedup(): number {
        return game_data()?.settings.speedup ?? 1;
    }

    static get max_world_size(): number {
        return game_data()?.settings.max_world_size ?? 0;
    }

    static get current_world_size(): number {
        return game_data()?.settings.current_world_size ?? 0;
    }

    static get total_play_time(): number {
        return game_data()?.time ?? 0.0;
    }
}

export class Communication {
    static get running(): boolean {
        return game_data()?.communication.running ?? false;
    }

    static set running(value: boolean) {
        const gameData = game_data();
        if (gameData === undefined) return;
        gameData.communication.running = value;
    }

    static get stop_running(): boolean {
        return game_data()?.communication.stop_running ?? false;
    }

    static set stop_running(value: boolean) {
        const gameData = game_data();
        if (gameData === undefined) return;
        gameData.communication.stop_running = value;
    }

    static get error(): string | null {
        return game_data()?.communication.error ?? null;
    }

    static set error(value: string | null) {
        const gameData = game_data();
        if (gameData === undefined) return;
        gameData.communication.error = value;
    }
}

// Drone class
export class Drone {
    static get position(): [number, number] {
        return game_data()?.drone.position ?? [0, 0];
    }

    static set position(value: [number, number]) {
        if (value.length !== 2) throw new Error('Position must be a list of two integers');
        if (value[0] < 0 || value[0] >= Settings.current_world_size || value[1] < 0 || value[1] >= Settings.current_world_size) {
            throw new Error('Position out of bounds');
        }
        const gameData = game_data();
        if (gameData === undefined) return;
        gameData.drone.last_position = Drone.position;
        gameData.drone.position = value;
    }

    static get last_position() {
        return game_data()?.drone.last_position ?? [0, 0];
    }
}

// Field class
export class Field {
    static _get(x: number, y: number): FieldEntry {
        const gameData = game_data();
        if (x < 0 || x >= Settings.current_world_size || y < 0 || y >= Settings.current_world_size) {
            throw new Error('Coordinates out of bounds');
        }
        if (gameData === undefined) throw new Error('Game data not initialized');
        const index = Settings.max_world_size * y + x;
        return gameData.field[index];
    }

    static get_type(x: number, y: number): EntityType {
        return Entity[Field._get(x, y).type];
    }

    static set_type(x: number, y: number, entity: EntityKey) {
        Field._get(x, y).type = entity;
    }

    static get_ground(x: number, y: number): GroundType {
        return Ground[Field._get(x, y).ground];
    }

    static set_ground(x: number, y: number, ground: GroundKey) {
        Field._get(x, y).ground = ground;
    }

    static get_growth(x: number, y: number): number {
        return clamp(Field._get(x, y).growth, 0.0, 1.0);
    }

    static set_growth(x: number, y: number, growth: number) {
        Field._get(x, y).growth = growth;
    }

    static get_water(x: number, y: number): number {
        return clamp(Field._get(x, y).water, 0.0, 1.0);
    }

    static set_water(x: number, y: number, water: number) {
        Field._get(x, y).water = water;
    }

    static get_measure(x: number, y: number): number | null {
        const measure = Field._get(x, y).measure;
        if (measure === -1) return null;
        return measure;
    }

    static set_measure(x: number, y: number, measure: number | null) {
        if (measure === null) measure = -1;
        else if (measure < 0) throw new Error('Measure must be greater than or equal to 0. -1 is used to indicate no measure.');
        Field._get(x, y).measure = measure;
    }
}

// Inventory class
export class Inventory {
    static get(item: ItemKey): number {
        return game_data()?.inventory[item] ?? 0;
    }

    static set(item: ItemKey, value: number) {
        const gameData = game_data();
        if (gameData === undefined) return;
        gameData.inventory[item] = value;
    }

    static add(item: ItemKey, value: number) {
        Inventory.set(item, Inventory.get(item) + value);
    }

    static remove(item: ItemKey, value: number) {
        Inventory.set(item, Inventory.get(item) - value);
    }

    static all(): [ItemKey, number][] {
        return Object.entries(game_data()?.inventory ?? {}) as [ItemKey, number][];
    }
}
