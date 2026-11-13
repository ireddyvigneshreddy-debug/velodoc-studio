export type SlideLayoutType =
  | "title"
  | "two-column"
  | "three-card"
  | "process-flow"
  | "comparison-table"
  | "code-algorithm"
  | "metric-highlight";

export type PptThemeId =
  | "iare"
  | "neon"
  | "ieee"
  | "emerald"
  | "royal"
  | "paper";

export type IareAssessmentType =
  | "AAT-I Tech Talk"
  | "AAT-II Tech Talk"
  | "Concept Video Presentation"
  | "Open-Ended Experiment"
  | "Project Review";

export type IareDepartment =
  | "Computer Science and Engineering (CSE)"
  | "CSE (Artificial Intelligence & Machine Learning)"
  | "CSE (Data Science)"
  | "CSE (Cyber Security)"
  | "Information Technology (IT)"
  | "Electronics and Communication Engineering (ECE)"
  | "Electrical and Electronics Engineering (EEE)"
  | "Aeronautical Engineering (AE)"
  | "Mechanical Engineering (ME)"
  | "Civil Engineering (CE)"
  | "Freshman Engineering (I B.Tech)";

export interface IareMetadata {
  isIareMode: boolean;
  assessmentType: IareAssessmentType;
  department: string;
  semesterRegulation: string;
  courseName: string;
  courseCode: string;
  rollNumber: string;
  studentName: string;
  facultyName?: string;
  customLogoBase64?: string;
}

export interface PptThemeDefinition {
  id: PptThemeId;
  name: string;
  tagline: string;
  bgHex: string;
  cardBgHex: string;
  textHex: string;
  subtextHex: string;
  primaryAccentHex: string;
  secondaryAccentHex: string;
  borderHex: string;
  isDark: boolean;
}

export interface SlideCard {
  title: string;
  text: string;
  tag?: string;
}

export interface SlideProcessStep {
  step: number;
  title: string;
  desc: string;
}

export interface SlideTable {
  headers: string[];
  rows: string[][];
}

export interface SlideCode {
  language: string;
  code: string;
  caption?: string;
}

export interface SlideMetric {
  value: string;
  label: string;
  context: string;
}

export interface SlideColumn {
  title: string;
  bullets: string[];
}

export interface TechTalkSlide {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  category?: string; // e.g. "PROBLEM STATEMENT", "SYSTEM ARCHITECTURE"
  bulletPoints?: string[];
  columns?: SlideColumn[];
  cards?: SlideCard[];
  processSteps?: SlideProcessStep[];
  table?: SlideTable;
  codeSnippet?: SlideCode;
  metric?: SlideMetric;
  speakerNotes: string; // 3-4 sentence conversational verbal script for stage delivery
}

export interface TechTalkPresentation {
  topic: string;
  details: string;
  presenterName: string;
  collegeName: string;
  eventName: string;
  slideCount: number;
  themeId: PptThemeId;
  slides: TechTalkSlide[];
  createdAt: number;
  iareMetadata?: IareMetadata;
}

export type AiProviderId =
  | "zero-key"
  | "gemini"
  | "groq"
  | "openai"
  | "openrouter";

export interface ApiVaultConfig {
  provider: AiProviderId;
  geminiKey?: string;
  groqKey?: string;
  openaiKey?: string;
  openrouterKey?: string;
  customModelId?: string;
}
