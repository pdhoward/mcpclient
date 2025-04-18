"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button"; // Shadcn/UI Button
import PersonaNavbar from "./PersonaNavbar";

const FloatingAvatar = () => {
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const handleAvatarClick = () => {
    setIsNavbarOpen(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[1000] flex flex-col items-center">
      {!isNavbarOpen && (
        <Button
          onClick={handleAvatarClick}
          className="p-0 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 animate-float"
        >
          <Image
            src="https://www.datocms-assets.com/96965/1743435052-thalia.png"
            alt="Floating Avatar"
            width={100}
            height={100}
            className="rounded-full"
          />
        </Button>
      )}
      {isNavbarOpen && (
        <PersonaNavbar onClose={() => setIsNavbarOpen(false)} />
      )}
    </div>
  );
};

export default FloatingAvatar;