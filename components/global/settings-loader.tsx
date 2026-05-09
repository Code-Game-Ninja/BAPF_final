"use client";

import { useEffect } from "react";
import { useSettingValue } from "@/lib/hooks/use-settings";
import { setMaxFileSizeMB } from "@/lib/helpers/storage";

/**
 * Invisible component that loads admin-configured settings
 * (e.g. max file upload size) and applies them at runtime.
 */
export function SettingsLoader() {
  const { data: maxFileSizeMb } = useSettingValue<string>("max_file_size_mb");

  useEffect(() => {
    if (maxFileSizeMb) {
      const mb = parseInt(maxFileSizeMb, 10);
      if (!isNaN(mb) && mb > 0) {
        setMaxFileSizeMB(mb);
      }
    }
  }, [maxFileSizeMb]);

  return null;
}
