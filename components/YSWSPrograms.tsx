"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import type { YSWSProgram } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function YSWSPrograms() {
  const [programs, setPrograms] = useState<YSWSProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch("/api/ysws");
        const data = await response.json();
        const sortedData = data.sort(
          (a: YSWSProgram, b: YSWSProgram) =>
            b.fields["Unweighted–Total"] - a.fields["Unweighted–Total"]
        );
        setPrograms(sortedData);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </Card>
        ))}
      </div>
    );
  }

  const maxTotal = Math.max(
    ...programs.map((p) => p.fields["Unweighted–Total"])
  );

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "completed":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "draft":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "alpha/unconfirmed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program, index) => (
        <motion.div
          key={program.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 dark:bg-gray-800/50 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{program.fields.Name}</h3>
                <Badge
                  className={`ml-2 ${getStatusColor(
                    program.fields.Status || "unknown"
                  )}`}
                >
                  {program.fields.Status || "Unknown"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Total Participants</span>
                    <span className="font-mono">
                      {program.fields["Unweighted–Total"].toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      (program.fields["Unweighted–Total"] / maxTotal) * 100
                    }
                    className="h-2 transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
