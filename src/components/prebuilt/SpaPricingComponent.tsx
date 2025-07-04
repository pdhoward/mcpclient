
const SpaPricingComponent: React.FC = () => {
  return (
    <div
      className="bg-neutral-800 p-4 rounded-lg shadow-lg shadow-[0_0_10px_rgba(234,179,8,0.2)] text-neutral-200"
      aria-label="Spa Resort Services"
    >
      <h2 className="text-lg font-semibold font-serif text-gold-500 mb-2">Spa Resort Services</h2>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Luxury Waterfall Massage - $250
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Nails and Facial - $100
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Serenity Time - $38
        </li>
      </ul>
      <p className="text-xs text-neutral-400 mt-2">
        Rejuvenate with our premium spa treatments at Cypress Resorts.
      </p>
    </div>
  );
};

export default SpaPricingComponent;