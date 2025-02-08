"use client";

import { motion } from "framer-motion";

export function AnimatedHero() {
  return (
    <motion.div
      className="mb-8 text-center"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        YSWS Tracker
      </h2>
      <p className="mt-4 text-lg text-muted-foreground">
        Track new ysws programs and how many people are participating
      </p>
    </motion.div>
  );
}
