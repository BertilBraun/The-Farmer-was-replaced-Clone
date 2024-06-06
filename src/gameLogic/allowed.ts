
export const gameLibraryFunctionsWithParams = ['delay', 'move', 'measure', 'plant', 'trade', 'use_item', 'num_items', 'swap'];
export const gameLibraryFunctionParameters = {
    'delay': 'seconds',
    'move': 'dir',
    'measure': 'dir',
    'plant': 'Entity.',
    'trade': 'Item.',
    'use_item': 'Item.',
    'num_items': 'Item.',
    'swap': 'Direction.',
};
export const gameLibraryFunctionsWithoutParams = ['get_pos_x', 'get_pos_y', 'get_world_size', 'get_water', 'harvest', 'can_harvest', 'till'];

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

