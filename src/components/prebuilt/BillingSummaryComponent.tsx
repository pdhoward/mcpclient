'use client';
import React from 'react';

const BillingSummaryComponent: React.FC = () => {
  return (
    <div
      className="bg-neutral-800 p-4 rounded-lg shadow-lg shadow-[0_0_10px_rgba(234,179,8,0.2)] text-neutral-200"
      aria-label="Billing Summary"
    >
      <h2 className="text-lg font-semibold font-serif text-gold-500 mb-2">Billing Summary</h2>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          3 Nights in Luxury Suite: $1,200
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Spa experience: $250
        </li>
        <li className="hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Dining: $150
        </li>
        <li className="font-bold hover:bg-neutral-700 hover:text-gold-400 transition-colors duration-200">
          Total: $1,600
        </li>
      </ul>
      <p className="text-xs text-neutral-400 mt-2">
        View your charges for a luxurious stay at Cypress Resorts.
      </p>
    </div>
  );
};

export default BillingSummaryComponent;