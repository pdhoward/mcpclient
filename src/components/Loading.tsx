// LoadingWaveform.tsx

interface LoadingProps {
  className?: string; // Optional className for custom styling
}

const Loading: React.FC <LoadingProps> = ({ className }) => {
    // Inline style for the bars' animation delay
    const barStyle = (delay: number) => ({
      animation: `audio-wave 2.2s ${delay}s infinite ease-in-out`,
    });
  
    return (
      <>
        {/* Injecting CSS directly into the component */}
        <style>
          {`
            @keyframes audio-wave {
              0% {
                height: 6px;
                transform: translateY(0px);
                background: #ff8e3a;
              }
              25% {
                height: 40px;
                transform: translateY(-5px) scaleY(1.7);
                background: #ed509e;
              }
              50% {
                height: 6px;
                transform: translateY(0px);
                background: #9c73f8;
              }
              100% {
                height: 6px;
                transform: translateY(0px);
                background: #0fccce;
              }
            }
          `}
        </style>
        <div className={`flex justify-center items-center ${className}`}>
          <div className="flex gap-2 justify-center items-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={barStyle(i * 0.2)} className="block w-2.5 h-1.5 rounded-full bg-orange-400"></div>
            ))}
          </div>
        </div>
      </>
    );
  };
  
  export default Loading;
  