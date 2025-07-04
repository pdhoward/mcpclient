
const WaterfallVideoComponent: React.FC = () => {
  return (
    <div className="bg-neutral-800 p-6 rounded-lg shadow-lg text-neutral-200">
      <h2 className="text-xl font-semibold mb-4">Cypress Resorts Waterfall</h2>
      <div className="relative w-full max-w-[600px] mx-auto">
        <video
          width="100%"
          height="auto"
          controls
          preload="auto"
          className="rounded-lg"
          aria-label="Cypress Resorts Waterfall Video"
        >
          <source
            src="https://res.cloudinary.com/stratmachine/video/upload/v1751649061/cypress/cypresswaterfall_my6x79.mp4"
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
        Enjoy the serene beauty of our signature 50-foot waterfall, a centerpiece of Cypress Resorts.
      </p>
    </div>
  );
};

export default WaterfallVideoComponent;