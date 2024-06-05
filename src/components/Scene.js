import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

const Scene = ({ code }) => {
  const meshRef = useRef();

  useEffect(() => {
    // Here you can execute the code with Brython
    if (window.Brython) {
      window.Brython.runScript(code);
    }
  }, [code]);

  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={'orange'} />
      </mesh>
    </Canvas>
  );
};

export default Scene;
