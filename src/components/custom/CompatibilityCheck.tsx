"use client";

import React, { useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { logger } from "@/lib/logger";

export function CompatibilityCheck({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCompatible, setIsCompatible] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkCompatibility = async () => {
      try {
        if (typeof WebContainer !== "undefined") {
          setIsCompatible(true);
        } else {
          setIsCompatible(false);
          setErrorMessage(
            "Your browser does not support WebContainers. Please use Chrome or Edge."
          );
        }
      } catch (error) {
        logger.error("Error checking WebContainer compatibility", error);
        setIsCompatible(false);
        setErrorMessage(
          "Error checking WebContainer compatibility. Please refresh the page."
        );
      }
    };

    checkCompatibility();
  }, []);

  if (isCompatible === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900">
        <p className="text-white">Checking browser compatibility...</p>
      </div>
    );
  }

  if (isCompatible === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900">
        <div className="max-w-md p-6 bg-zinc-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            Browser Compatibility Issue
          </h2>
          <p className="text-white mb-4">{errorMessage}</p>
          <ul className="list-disc list-inside text-white mb-4">
            <li>Chrome 105+ (recommended)</li>
            <li>Edge 105+</li>
            <li>Firefox 106+ (experimental support)</li>
          </ul>
          <p className="text-zinc-400 text-sm">
            WebContainers require modern browser features to run Node.js
            environments in your browser.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
