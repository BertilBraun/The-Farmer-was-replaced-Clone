import { allowedStdLibFunctions, allowedTypes, gameLibraryFunctionsWithParams, gameLibraryFunctionsWithoutParams } from "./allowed";



function getLibraryFunctions(gameLogicCode: string) {
    const functionRegex = /async def ([a-zA-Z]\w*)\(/g;
    let match;
    const library = [];

    while ((match = functionRegex.exec(gameLogicCode)) !== null) {
        library.push(match[1]);
    }

    return library;
}

export const processCode = async (code: string) => {
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

