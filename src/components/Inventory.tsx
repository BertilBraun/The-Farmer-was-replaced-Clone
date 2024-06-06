import React from 'react';
import { Item, ItemKey } from '../gameLogic/enums';

interface InventoryItemProps {
  item: ItemKey;
  count: number;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item, count }) => (
  <div style={{ margin: 5, padding: 5, border: '1px solid black' }}>
    {Item[item].name}: {(item === 'POWER') ? count.toFixed(2) : count.toFixed(0)}
  </div>
);

interface InventoryProps {
  inventory: [ItemKey, number][];
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
