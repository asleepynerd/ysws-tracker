"use client";

import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import NotificationButton from '@/components/NotificationButton';

export function AnimatedHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">YSWS Tracker</h1>
          </motion.div>
          <div className="flex items-center space-x-2">
            <NotificationButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}