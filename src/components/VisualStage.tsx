'use client';
import React from 'react';
import RoomComponent from '@/components/prebuilt/RoomComponent';
import SpaPricingComponent from '@/components/prebuilt/SpaPricingComponent';
import MenuComponent from '@/components/prebuilt/MenuComponent';
import WaterfallVideoComponent from '@/components/prebuilt/WaterfallVideoComponent';
import BillingSummaryComponent from '@/components/prebuilt/BillingSummaryComponent';
import SitePlanComponent from '@/components/prebuilt/SitePlanComponent';

interface VisualStageProps {
  componentId: string;
  setComponentId: (id: string) => void; // New prop to reset componentId
}

const VisualStage: React.FC<VisualStageProps> = ({ componentId, setComponentId }) => {
  const components: { [key: string]: React.ReactNode } = {
    room: <RoomComponent />,
    menu: <MenuComponent />,
    billing: <BillingSummaryComponent />,
    site_plan: <SitePlanComponent />,
    spa_pricing: <SpaPricingComponent />,
    waterfall_video: <WaterfallVideoComponent />,
  };

  // Handle close button click
  const handleClose = () => {
    setComponentId(''); // Reset to show welcome message
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-neutral-200 relative">
      {componentId && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 bg-neutral-700 text-gold-500 hover:bg-gold-500 hover:text-neutral-900 font-medium text-sm py-1 px-3 rounded-full shadow-md transition-colors duration-200"
          aria-label="Close visual component"
        >
          Close
        </button>
      )}
      {components[componentId] || (
        <p className="text-lg font-medium text-neutral-200">
          Welcome to Cypress Resorts. Ask to see a room, menu, or more!
        </p>
      )}
    </div>
  );
};

export default VisualStage;