// src/components/OptimizedImage.tsx
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  size: "thumbnail" | "medium" | "large";
  className?: string;
}

const OptimizedImage = ({
  src,
  alt,
  size,
  className = "",
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Convert original URL to optimized version
  const optimizedSrc = src.replace("/events/", `/processed/${size}/events/`);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          Failed to load image
        </div>
      ) : (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
          className={`w-full h-full object-cover ${
            isLoading ? "invisible" : "visible"
          }`}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
