import { Suspense } from "react";
import YSWSPrograms from "@/components/YSWSPrograms";
import { AnimatedHeader } from "@/components/animated-header";
import { AnimatedHero } from "@/components/animated-hero";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AnimatedHeader />

      <main className="container mx-auto px-4 py-8">
        <AnimatedHero />

        <Suspense fallback={<div>Loading programs...</div>}>
          <YSWSPrograms />
        </Suspense>
      </main>

      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Most recent update: {new Date().toLocaleDateString()}
            <br />
            Powered by{" "}
            <a
              href="https://hackclub.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hack Club
            </a>{" "}
            &{" "}
            <a
              href="https://sleepy.engineer"
              target="_blank"
              rel="noopener noreferrer"
            >
              sleepy.engineer
            </a>{" "}
            &lt;3
          </p>
        </div>
      </footer>
    </div>
  );
}
