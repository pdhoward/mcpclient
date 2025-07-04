// components/prebuilt/SitePlanComponent.tsx
const SitePlanComponent: React.FC = () => (
  <div className="bg-neutral-800 p-6 rounded-lg shadow-lg text-neutral-200">
      <h2 className="text-xl font-semibold mb-4">Cypress Resorts Site Plan</h2>
      <div className="relative w-full max-w-[600px] mx-auto">
        <video
          width="100%"
          height="auto"
          controls
          preload="auto"
          className="rounded-lg"
          aria-label="Cypress Resorts Site Plan"
        >
          <source
            src="https://res.cloudinary.com/stratmachine/video/upload/v1751653644/cypress/sitemap_buvsgw.mp4"
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
        Join us on an extraordinary journey as we craft a 25+ unit luxury woodland resort, featuring 15 premium amenities. Over the next 5 years, we'll create your ultimate escape. .
      </p>
    </div>
);
export default SitePlanComponent;