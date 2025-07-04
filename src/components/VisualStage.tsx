'use client';
import { usePathname } from 'next/navigation';
import RoomComponent from '@/components/prebuilt/RoomComponent';
import SpaPricingComponent from '@/components/prebuilt/SpaPricingComponent';
import MenuComponent from '@/components/prebuilt/MenuComponent';
import WaterfallVideoComponent from '@/components/prebuilt/WaterfallVideoComponent';
import BillingSummaryComponent from '@/components/prebuilt/BillingSummaryComponent';
import SitePlanComponent from '@/components/prebuilt/SitePlanComponent';

interface VisualStageProps {
  componentId: string;
}

const VisualStage: React.FC<VisualStageProps> = ({ componentId }) => {
  const components: { [key: string]: React.ReactNode } = {
    room: <RoomComponent />,
    menu: <MenuComponent />,
    billing: <BillingSummaryComponent />,
    site_plan: <SitePlanComponent />,
    spa_pricing: <SpaPricingComponent />,
    waterfall_video: <WaterfallVideoComponent />
};

  return (
    <div className="h-full flex flex-col items-center justify-center text-neutral-200">
      {components[componentId] || (
        <p className="text-lg">Welcome to Cypress Resorts. Ask to see a room, menu, or more!</p>
      )}
    </div>
  );
};

export default VisualStage;