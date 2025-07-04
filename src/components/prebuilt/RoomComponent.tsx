'use client';
import React, { useRef, useState, useEffect } from 'react';


const RoomComponent: React.FC = () => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

    // Video playlist with Cloudinary URLs
  const videoPlaylist = [
    {
      src: 'https://res.cloudinary.com/stratmachine/video/upload/v1751653643/cypress/unit1_gurm14.mp4',
      label: 'Villa Entrance',
    },
    {
      src: 'https://res.cloudinary.com/stratmachine/video/upload/v1751653642/cypress/House_KitchenExterior-2_skxah2.mp4', 
      label: 'Chef-grade Kitchen',
    },
    {
      src: 'https://res.cloudinary.com/stratmachine/video/upload/v1751653642/cypress/unit3_lut1r8.mp4', 
      label: 'Your Sanctuary in Nature',
    },
  ];

  // Handle video end to play the next video or loop back
  const handleVideoEnded = () => {
    setCurrentVideoIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % videoPlaylist.length;
      return nextIndex;
    });
  };

    // Load and play video when index changes
  useEffect(() => {
    if (videoRef.current) {
      const playVideo = () => {
        videoRef.current!.play().catch((error) => {
          console.error('Autoplay failed:', error);
        });
      };

      // Wait for video data to load before playing
      videoRef.current.load();
      videoRef.current.addEventListener('loadeddata', playVideo);

      // Cleanup event listener
      return () => {
        videoRef.current?.removeEventListener('loadeddata', playVideo);
      };
    }
  }, [currentVideoIndex]);
  
  return (
  <div className="bg-neutral-800 p-6 rounded-lg shadow-lg text-neutral-200">
      <h2 className="text-xl font-semibold mb-4">Cypress Resort's Luxury Villas</h2>
      <h3 className="text-xl font-semibold mb-4">{videoPlaylist[currentVideoIndex].label}</h3>
      <div className="relative w-full max-w-[600px] mx-auto">
        <video
          ref={videoRef}
          width="100%"
          height="auto"
          controls
          autoPlay     
          muted    
          preload="auto"
          className="rounded-lg"
          aria-label={videoPlaylist[currentVideoIndex].label}
          onEnded={handleVideoEnded}
        >
          <source
            src={videoPlaylist[currentVideoIndex].src}
            type="video/mp4"
          />
          {/* Optional: Add captions track when available */}
          {/* <track
            src="/path/to/captions.vtt"
            kind="subtitles"
            srcLang="en"
            label="English"
          /> */}
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-sm mt-4 text-neutral-400">
       A sanctuary crafted just for you.
      </p>
    </div>
)}
export default RoomComponent;