'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

// Types for component props
interface VoiceAgentButtonProps {
  maxWidth?: string; // e.g., '225px' or '500px'
}

const VoiceAgentButton: React.FC<VoiceAgentButtonProps> = ({ maxWidth = '225px' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle connection state
  const handleToggle = () => {
    setIsConnected((prev) => !prev);
  };

  // Three.js setup with wave effect
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
    });

    // Set renderer size
    const size = canvasRef.current.parentElement?.clientWidth || 285;
    renderer.setSize(size, size);
    camera.position.z = 5;

    // Wave effect using ShaderMaterial
    const geometry = new THREE.PlaneGeometry(10, 10, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          // Create a sinusoidal wave pattern
          float wave = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          // Use wave to influence color (blueish gradient)
          vec3 color = vec3(0.2, 0.5, 0.8 + wave * 0.2);
          gl_FragColor = vec4(color, 0.5);
        }
      `,
      uniforms: {
        time: { value: 0 },
      },
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      // Update time uniform for wave animation
      material.uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newSize = containerRef.current?.clientWidth || size;
      renderer.setSize(newSize, newSize);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex justify-center items-center mx-auto mb-24 md:mb-0 rounded-full overflow-visible min-w-0 flex-1 aspect-square ${
        maxWidth === '500px' ? 'md:max-w-[500px]' : 'max-w-[225px]'
      } col-span-3 md:col-auto row-start-1 md:row-auto`}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden">
        <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
          <canvas
            ref={canvasRef}
            className="block w-full h-full"
            style={{ width: '100%', height: '100%' }}
            data-engine="three.js"
          />
        </div>
      </div>
      <button
        onClick={handleToggle}
        className="absolute flex items-center h-12 px-2 rounded-full bg-gray-800 text-white shadow-lg outline-2 outline-offset-4 focus-visible:outline focus-visible:outline-white"
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-800 transition-transform duration-300 ${
            isConnected ? 'scale-150' : 'scale-100'
          }`}
          data-connected={isConnected}
        >
          {/* Microphone Icon (Disconnected) */}
          <svg
            className={`absolute transition-opacity duration-300 ${
              isConnected ? 'opacity-0' : 'opacity-100'
            }`}
            fill="none"
            height="16"
            viewBox="0 0 16 16"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.33301 6.66675V8.66675"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
            <path
              d="M4 4V11.3333"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
            <path
              d="M6.66602 2V14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
            <path
              d="M9.33203 5.33337V10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
            <path
              d="M12 3.33337V12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
            <path
              d="M14.667 6.66675V8.66675"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2905"
            />
          </svg>
          {/* Phone Icon (Connected) */}
          <svg
            className={`absolute transition-opacity duration-300 ${
              isConnected ? 'opacity-100' : 'opacity-0'
            }`}
            fill="none"
            height="12"
            viewBox="0 0 16 16"
            width="12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_61_42)">
              <path
                d="M7.12028 8.87332C7.79685 9.55048 8.56149 10.1335 9.39361 10.6067L10.2403 9.75998C10.4215 9.58074 10.6504 9.45722 10.8997 9.40405C11.149 9.35088 11.4083 9.37029 11.6469 9.45998C12.2518 9.68568 12.8802 9.84224 13.5203 9.92665C13.8406 9.97193 14.1336 10.1322 14.3446 10.3775C14.5556 10.6228 14.6701 10.9364 14.6669 11.26V13.26C14.6677 13.4457 14.6297 13.6294 14.5553 13.7995C14.4809 13.9697 14.3718 14.1224 14.235 14.2479C14.0982 14.3734 13.9367 14.469 13.7608 14.5285C13.5849 14.5879 13.3985 14.61 13.2136 14.5933C11.1622 14.3704 9.19161 13.6694 7.46028 12.5467C6.65713 12.0367 5.91263 11.4397 5.24028 10.7667M3.46028 8.53998C2.33752 6.80865 1.63652 4.83809 1.41361 2.78665C1.39695 2.60229 1.41886 2.41649 1.47795 2.24107C1.53703 2.06564 1.63199 1.90444 1.75679 1.76773C1.88159 1.63102 2.03348 1.52179 2.20281 1.447C2.37213 1.37221 2.55517 1.33349 2.74028 1.33332H4.74028C5.06382 1.33013 5.37748 1.4447 5.62279 1.65567C5.8681 1.86664 6.02833 2.15961 6.07361 2.47998C6.15803 3.12003 6.31458 3.74847 6.54028 4.35332C6.62998 4.59193 6.64939 4.85126 6.59622 5.10057C6.54305 5.34988 6.41952 5.57872 6.24028 5.75998L5.39361 6.60665"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.33333"
              />
              <path
                d="M14.6663 1.33337L1.33301 14.6667"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.33333"
              />
            </g>
            <defs>
              <clipPath id="clip0_61_42">
                <rect fill="white" height="16" width="16" />
              </clipPath>
            </defs>
          </svg>
        </span>
        <span className="px-8 overflow-hidden whitespace-nowrap">Try a call</span>
      </button>
    </div>
  );
};

export default VoiceAgentButton;