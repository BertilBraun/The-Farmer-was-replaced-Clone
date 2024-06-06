import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import { Field } from '../GameLogic';

const entityColors = {
  PUMPKIN: 'orange',
  HAY: 'yellow',
  BUSH: 'lightgreen',
  TREE: 'brown',
  CARROT: 'orange',
  CACTUS: 'green',
};

const groundColors = {
  DIRT: 'green',
  TILLED: 'saddlebrown',
};

function GroundBox({ x, y }) {
  const color = groundColors[Field.get_ground(x, y)];
  const waterFactor = 1 - Field.get_water(x, y);
  return (
    <Box position={[x, y, 0]}>
      <meshStandardMaterial attach="material" color={color} opacity={waterFactor} />
    </Box>
  );
}

function EntityBox({ x, y }) {
  const entity = Field.get_type(x, y);
  const growth = Field.get_growth(x, y);
  const color = entityColors[entity] || 'gray';
  return (
    <Box position={[x, y, 0.5]} scale={[0.75, 0.75, 0.75 * growth]}>
      <meshStandardMaterial attach="material" color={color} />
    </Box>
  );
}

const Scene = ({ time }) => {
  const world_size = window.game_data?.settings.current_world_size ?? 0;

  return (
    <Canvas style={{ height: '500px', border: '1px solid black' }}>
      <ambientLight />
      <pointLight position={[10 + Math.sin(time), 10, 10 + Math.sin(time)]} />
      <OrbitControls />
      {[...Array(world_size).keys()].map(y =>
        [...Array(world_size).keys()].map(x => (
          <React.Fragment key={`${x}-${y}`}>
            <GroundBox x={x} y={y} />
            {Field.get_type(x, y) !== 'NOTHING' && (<EntityBox x={x} y={y} />)}
          </React.Fragment>
        ))
      )}
    </Canvas>
  );
};

export default Scene;
