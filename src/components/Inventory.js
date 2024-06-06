import React from 'react';


function InventoryItem({ item, count }) {
  return (
    <div style={{ margin: 5, padding: 5, border: '1px solid black' }}>
      {item}: {count.toFixed(1)}
    </div>
  );
}


const Inventory = ({ inventory }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: 5, padding: 5, border: '1px solid black', textAlign: 'center' }}>
      <p>Inventory</p>
      <br />
      {inventory.map((item) => <InventoryItem key={item[0]} item={item[0]} count={item[1]} />)}
    </div>
  );
};

export default Inventory;
