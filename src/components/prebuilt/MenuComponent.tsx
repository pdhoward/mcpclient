
const MenuComponent: React.FC = () => {
  return (
    <div
      className="bg-neutral-800 p-4 rounded-lg shadow-lg shadow-[0_0_10px_rgba(234,179,8,0.2)] text-neutral-200"
      aria-label="Resort Dining Menu"
    >
      <h2 className="text-lg font-semibold font-serif text-gold-500 mb-2">Resort Dining Menu</h2>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Grilled Seabass - $45
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Truffle Risotto - $38
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Chocolate Lava Cake - $12
        </li>
      </ul>
      <p className="text-xs text-neutral-400 mt-2">
        Savor exquisite dishes crafted by our executive chef at Cypress Resorts.
      </p>
    </div>
  );
};

export default MenuComponent;