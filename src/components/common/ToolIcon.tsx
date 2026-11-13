import React from "react";
import {
  Minimize2,
  Sparkles,
  Layers,
  FileImage,
  Image as ImageIcon,
  FileText,
  FileCode,
  Scissors,
  RotateCw,
  Trash2,
  FilePlus,
  PenTool,
  ShieldAlert,
  Stamp,
  Hash,
  Crop,
  SunMedium,
  GitCompare,
  FileSearch,
  Camera,
  ShieldCheck,
  LayoutGrid,
  QrCode,
  FileSpreadsheet,
  Award,
  Presentation,
  FileEdit,
  Code,
  LucideProps,
} from "lucide-react";

export const TOOL_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Minimize2,
  Sparkles,
  Layers,
  FileImage,
  Image: ImageIcon,
  FileText,
  FileCode,
  Scissors,
  RotateCw,
  Trash2,
  FilePlus,
  PenTool,
  ShieldAlert,
  Stamp,
  Hash,
  Crop,
  SunMedium,
  GitCompare,
  FileSearch,
  Camera,
  ShieldCheck,
  LayoutGrid,
  QrCode,
  FileSpreadsheet,
  Award,
  Presentation,
  FileEdit,
  Code,
};

interface ToolIconProps {
  name: string;
  className?: string;
}

export function ToolIcon({ name, className }: ToolIconProps) {
  const IconComponent = TOOL_ICON_MAP[name] || FileText;
  return <IconComponent className={className} />;
}
