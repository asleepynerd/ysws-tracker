"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const subscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
      toast({
        title: "Notifications enabled",
        description: "You'll receive updates about new YSWS programs.",
      });
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        });
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications disabled",
        description: "You won't receive any more notifications.",
      });
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast({
        title: "Error",
        description: "Failed to disable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={isSubscribed ? unsubscribe : subscribe}
      title={isSubscribed ? "Disable notifications" : "Enable notifications"}
    >
      {isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </Button>
  );
}
