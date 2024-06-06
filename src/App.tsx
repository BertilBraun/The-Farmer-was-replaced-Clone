import React, { useState } from 'react';
import Editor from './components/Editor';
import Scene from './components/Scene';
import InventoryDisplay from './components/Inventory';
import './App.css';
import { Button } from './components/Button';
import { TimeDisplay } from './components/TimeDisplay';
import { Communication, Inventory, Settings } from './gameLogic/accessors';
import { processCode } from './gameLogic/processCode';
import { initializeGame } from './gameLogic/logic';

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
  const [time, setTime] = useState(0.0);
  const [running, setRunning] = useState(false);
  const [inventory, setInventory] = useState(Inventory.all());

  const startCodeExecution = async () => {
    if (Communication.running) {
      console.error('Already running');
      return;
    }

    const codeToRun = await processCode(code);
    if (!codeToRun) {
      console.error('Error processing code');
      return;
    }
    console.log('Running code: ', codeToRun);

    initializeGame();

    setInventory(Inventory.all());
    setRunning(Communication.running);

    Communication.stop_running = false;
    Communication.running = true;

    const script = document.createElement('script');
    script.type = 'text/python';
    script.innerHTML = codeToRun;
    document.body.appendChild(script);

    let last_time = 0.0;
    while (Communication.running) {
      // Spin with 5ms delay until the code execution is done
      await new Promise(resolve => setTimeout(resolve, 5));
      if (Settings.total_play_time - last_time > 1 / 30) {
        // Update the time to update the UI -> only do this every 1/30th of a second
        setTime(Settings.total_play_time);
        setInventory(Inventory.all());
        setRunning(Communication.running);
        last_time = Settings.total_play_time;
      }
    }

    if (Communication.error && !Communication.error.includes('Stopping execution')) {
      console.error(Communication.error);
      alert(Communication.error);
      Communication.error = null;
    }

    document.body.removeChild(script);
    setTime(Settings.total_play_time);
    setInventory(Inventory.all());
    setRunning(Communication.running);

    console.log('Done');
  }

  const stopCodeExecution = () => {
    Communication.stop_running = true;
    console.log('Stopping execution');
  }

  return (
    <div className="App">
      <main>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <TimeDisplay seconds={time} />
          <Button onClick={startCodeExecution} disabled={running}>Run</Button>
          <Button onClick={stopCodeExecution} disabled={!running}>Stop</Button>
          <Editor onCodeChange={setCode} code={code} />
          <InventoryDisplay inventory={inventory} />
        </div>
        <Scene time={time} />
      </main>
    </div>
  );
}

export default App;
