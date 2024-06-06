import React from 'react';
import { Canvas, Vector3 } from '@react-three/fiber';
import { Box, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Field, Settings } from '../gameLogic/accessors';
import { EntityKey, GroundKey } from '../gameLogic/enums';

const entityColors: Record<EntityKey, string> = {
  NOTHING: 'gray',
  PUMPKIN: 'orange',
  HAY: 'yellow',
  BUSH: 'lightgreen',
  TREE: 'brown',
  CARROT: 'orange',
  CACTUS: 'green',
  SUNFLOWER: 'yellow',
};

const groundColors: Record<GroundKey, string> = {
  DIRT: 'green',
  TILLED: 'saddlebrown',
};

type PositionProps = {
  x: number;
  y: number;
};

const GroundBox: React.FC<PositionProps> = ({ x, y }) => {
  const color = groundColors[Field.get_ground(x, y).identifier];
  const waterFactor = 1 - Field.get_water(x, y);

  return (
    <Box position={[x, y, 0]}>
      <meshStandardMaterial color={color} opacity={waterFactor} />
    </Box>
  );
};

const EntityBox: React.FC<PositionProps> = ({ x, y }) => {
  const entity = Field.get_type(x, y);

  if (entity.identifier === 'NOTHING') return null;

  const growth = Field.get_growth(x, y);
  const color = entityColors[entity.identifier];

  return (
    <Box position={[x, y, 0.501]} scale={[0.75, 0.75, 0.75 * growth]}>
      <meshStandardMaterial color={color} />
    </Box>
  );
};

type SceneProps = {
  time: number;
};

const Scene: React.FC<SceneProps> = ({ time }) => {
  const worldSize = Settings.current_world_size;
  const lightPosition: Vector3 = [10 + Math.sin(time) * 10, 10, 10 + Math.sin(time) * 10];
  // console.log('lightPosition', lightPosition);

  return (
    <Canvas style={{ height: '500px', border: '1px solid black' }}>
      <ambientLight />
      <PerspectiveCamera
        makeDefault
        position={[worldSize / 2, -4, 4]}
        fov={75}
      />
      <OrbitControls
        target={[worldSize / 2, worldSize / 2, 0]}
        enableZoom={true}
        enableRotate={false}
        enablePan={true}
        panSpeed={1}
      />
      {[...Array(worldSize).keys()].flatMap(y =>
        [...Array(worldSize).keys()].map(x => (
          <React.Fragment key={`${x}-${y}`}>
            <GroundBox x={x} y={y} />
            <EntityBox x={x} y={y} />
          </React.Fragment>
        ))
      )}
    </Canvas>
  );
};

export default Scene;
