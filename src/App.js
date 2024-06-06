import React, { useState } from 'react';
import Editor from './components/Editor';
import Scene from './components/Scene';
import Inventory from './components/Inventory';
import { initializeGame, processCode } from './GameLogic';
import './App.css';

const STARTER_CODE = `print('Hello, world!')
print('Harvesting all the Pumpkins!')
harvest()
print('Now farming Hay!')
while True:
    n = time()
    for i in range(3):
        for j in range(3):
            if can_harvest():
                harvest()
                trade(Item.EMPTY_BUCKET)
                plant(Entity.BUSH)
                use_item(Item.FULL_BUCKET)
            move(North)
        move(East)
    print('Time taken:', time() - n)
print('Goodbye, world!')`;

function App() {
  const [code, setCode] = useState(STARTER_CODE);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0.0);

  const startCodeExecution = async () => {
    if (window.running) {
      console.log('Already running');
      return;
    }

    initializeGame();

    window.stop = false;
    window.running = true; // The important global variable to communicate with the code execution
    setRunning(true); // Update UI

    const codeToRun = await processCode(code);
    console.log('Running code: ', codeToRun);

    const script = document.createElement('script');
    script.type = 'text/python';
    script.innerHTML = codeToRun;
    document.body.appendChild(script);

    let last_time = 0.0;
    while (window.running) {
      // Spin with 5ms delay until the code execution is done
      await new Promise(resolve => setTimeout(resolve, 5));
      if (window.game_data.time - last_time > 1 / 30) {
        // Update the time to update the UI -> only do this every 1/30th of a second
        setTime(window.game_data.time)
        last_time = window.game_data.time;
      }
    }

    if (window.error && !window.error.includes('Stopping execution')) {
      console.error(window.error);
      alert(window.error);
      window.error = null;
    }

    document.body.removeChild(script);
    setRunning(false);

    console.log('Done');
  }

  const stopCodeExecution = () => {
    window.stop = true;
    console.log('Stopping execution');
  }

  const inventory = Object.entries(window.game_data?.inventory ?? {});

  return (
    <div className="App">
      <header className="App-header">
        <h1>3D Coding Game</h1>
      </header>
      <main>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>Time: {time.toFixed(0)} sec</div>
          <button onClick={startCodeExecution} disabled={running} style={{ width: 100 }}>Run</button>
          <button onClick={stopCodeExecution} disabled={!running} style={{ width: 100 }}>Stop</button>
          <Editor onCodeChange={setCode} code={code} />
          <Inventory inventory={inventory} />
        </div>
        <Scene time={time} />
      </main>
    </div>
  );
}

export default App;
