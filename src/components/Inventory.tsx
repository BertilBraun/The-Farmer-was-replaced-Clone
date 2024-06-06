import React from 'react';

interface InventoryItemProps {
  item: string;
  count: number;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item, count }) => (
  <div style={{ margin: 5, padding: 5, border: '1px solid black' }}>
    {item}: {count.toFixed(1)}
  </div>
);

interface InventoryProps {
  inventory: [string, number][];
}

const Inventory: React.FC<InventoryProps> = ({ inventory }) => (
  <div style={{ display: 'flex', flexDirection: 'column', margin: 5, padding: 5, border: '1px solid black', textAlign: 'center' }}>
    <p>Inventory</p>
    <br />
    {inventory.map(([item, count]) => (
      <InventoryItem key={item} item={item} count={count} />
    ))}
  </div>
);

export default Inventory;
