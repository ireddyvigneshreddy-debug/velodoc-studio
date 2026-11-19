"use client";

import React from "react";
import {
  WarningCircle,
  Warning,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Medal,
  Barcode,
  Buildings,
  CalendarBlank,
  Camera,
  Check,
  CheckCircle,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock,
  Code,
  Columns,
  Command,
  Copy,
  ArrowBendDownLeft,
  Cpu,
  CreditCard,
  Crop,
  Crosshair,
  DownloadSimple,
  PencilSimple,
  ArrowSquareOut,
  Eye,
  EyeSlash,
  FileArrowDown,
  FileText,
  FileImage,
  FilePlus,
  FileMagnifyingGlass,
  FileCsv,
  Funnel,
  FlipHorizontal,
  FolderOpen,
  GitDiff,
  Globe,
  GraduationCap,
  GridFour,
  Hash,
  HardDrive,
  Question,
  ClockCounterClockwise,
  House,
  Image,
  Key,
  Stack,
  SquaresFour,
  CircleNotch,
  Lock,
  ArrowsOut,
  ArrowsIn,
  Moon,
  ArrowsOutCardinal,
  PenNib,
  Percent,
  Plus,
  PlusCircle,
  PresentationChart,
  Printer,
  QrCode,
  ArrowClockwise,
  ArrowCounterClockwise,
  FloppyDisk,
  Scissors,
  MagnifyingGlass,
  ShareNetwork,
  ShieldWarning,
  ShieldCheck,
  Shuffle,
  Sliders,
  SlidersHorizontal,
  Sparkle,
  SealCheck,
  Sun,
  Table,
  FileArchive,
  Target,
  Trash,
  TrendDown,
  TextT,
  ArrowUUpLeft,
  UploadSimple,
  CloudArrowUp,
  User,
  VideoCamera,
  WifiHigh,
  X,
  XCircle,
  Lightning,
  LightningSlash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  BookmarkSimple,
  Bookmark,
  IconProps as PhosphorIconProps,
} from "@phosphor-icons/react";

export type IconProps = PhosphorIconProps;
export type LucideProps = IconProps;

// Phosphor native re-exports
export {
  WarningCircle,
  Warning,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Medal,
  Barcode,
  Buildings,
  CalendarBlank,
  Camera,
  Check,
  CheckCircle,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock,
  Code,
  Columns,
  Command,
  Copy,
  ArrowBendDownLeft,
  Cpu,
  CreditCard,
  Crop,
  Crosshair,
  DownloadSimple,
  PencilSimple,
  ArrowSquareOut,
  Eye,
  EyeSlash,
  FileArrowDown,
  FileText,
  FileImage,
  FilePlus,
  FileMagnifyingGlass,
  FileCsv,
  Funnel,
  FlipHorizontal,
  FolderOpen,
  GitDiff,
  Globe,
  GraduationCap,
  GridFour,
  Hash,
  HardDrive,
  Question,
  ClockCounterClockwise,
  House,
  Image,
  Key,
  Stack,
  SquaresFour,
  CircleNotch,
  Lock,
  ArrowsOut,
  ArrowsIn,
  Moon,
  ArrowsOutCardinal,
  PenNib,
  Percent,
  Plus,
  PlusCircle,
  PresentationChart,
  Printer,
  QrCode,
  ArrowClockwise,
  ArrowCounterClockwise,
  FloppyDisk,
  Scissors,
  MagnifyingGlass,
  ShareNetwork,
  ShieldWarning,
  ShieldCheck,
  Shuffle,
  Sliders,
  SlidersHorizontal,
  Sparkle,
  SealCheck,
  Sun,
  Table,
  FileArchive,
  Target,
  Trash,
  TrendDown,
  TextT,
  ArrowUUpLeft,
  UploadSimple,
  CloudArrowUp,
  User,
  VideoCamera,
  WifiHigh,
  X,
  XCircle,
  Lightning,
  LightningSlash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  BookmarkSimple,
  Bookmark,
};

// Aliases for seamless 1:1 drop-in replacement
export const ArrowsClockwise = ArrowClockwise;
export const AlertCircle = WarningCircle;
export const AlertTriangle = Warning;
export const Award = Medal;
export const Building = Buildings;
export const Calendar = CalendarBlank;
export const CheckCircle2 = CheckCircle;
export const ChevronDown = CaretDown;
export const ChevronLeft = CaretLeft;
export const ChevronRight = CaretRight;
export const CornerDownLeft = ArrowBendDownLeft;
export const Download = DownloadSimple;
export const Edit2 = PencilSimple;
export const ExternalLink = ArrowSquareOut;
export const EyeOff = EyeSlash;
export const FileCheck = CheckCircle;
export const FileCode = Code;
export const FileDown = FileArrowDown;
export const FileEdit = PencilSimple;
export const FileSearch = FileMagnifyingGlass;
export const FileSpreadsheet = FileCsv;
export const Filter = Funnel;
export const GitCompare = GitDiff;
export const Grid = GridFour;
export const HelpCircle = Question;
export const History = ClockCounterClockwise;
export const Home = House;
export const Layers = Stack;
export const LayoutGrid = SquaresFour;
export const Loader2 = CircleNotch;
export const Maximize2 = ArrowsOut;
export const Minimize2 = ArrowsIn;
export const Move = ArrowsOutCardinal;
export const PenTool = PenNib;
export const Presentation = PresentationChart;
export const RefreshCw = ArrowClockwise;
export const RotateCcw = ArrowCounterClockwise;
export const RotateCw = ArrowClockwise;
export const Save = FloppyDisk;
export const Search = MagnifyingGlass;
export const Share2 = ShareNetwork;
export const ShieldAlert = ShieldWarning;
export const Sparkles = Sparkle;
export const Stamp = SealCheck;
export const SunMedium = Sun;
export const Trash2 = Trash;
export const TrendingDown = TrendDown;
export const Type = TextT;
export const Undo2 = ArrowUUpLeft;
export const Upload = UploadSimple;
export const UploadCloud = CloudArrowUp;
export const Video = VideoCamera;
export const Wifi = WifiHigh;
export const Zap = Lightning;
export const ZapOff = LightningSlash;
export const ZoomIn = MagnifyingGlassPlus;
export const ZoomOut = MagnifyingGlassMinus;

// Authentic GitHub Mark
export function GithubIcon({ className = "w-4 h-4", ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}
