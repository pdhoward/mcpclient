const RoomComponent: React.FC = () => (
  <div className="bg-neutral-800 p-6 rounded-lg shadow-lg text-neutral-200">
      <h2 className="text-xl font-semibold mb-4">Cypress Resort's Luxury Villas</h2>
      <div className="relative w-full max-w-[600px] mx-auto">
        <video
          width="100%"
          height="auto"
          controls
          preload="auto"
          className="rounded-lg"
          aria-label="Cypress Resort Villas"
        >
          <source
            src="https://res.cloudinary.com/stratmachine/video/upload/v1751653643/cypress/unit1_gurm14.mp4"
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
);
export default RoomComponent;