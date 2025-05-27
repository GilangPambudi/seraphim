import { Smartphone, Loader2 } from "lucide-react"

interface LoadingAnimationProps {
  message?: string
  brandName?: string
}

export function LoadingAnimation({ message, brandName }: LoadingAnimationProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Animated Phone Icon */}
        <div className="relative mb-8">
          <Smartphone className="h-16 w-16 text-primary mx-auto animate-pulse" />
          <Loader2 className="h-6 w-6 text-muted-foreground absolute -bottom-2 -right-2 animate-spin" />
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">{brandName ? `Loading ${brandName}` : "Loading"}</h2>
          <p className="text-muted-foreground">{message || "Fetching phone models from repository..."}</p>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-1 mt-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>

          {/* Cache Info */}
          <p className="text-xs text-muted-foreground mt-4">Data will be cached locally for faster access</p>
        </div>
      </div>
    </div>
  )
}
