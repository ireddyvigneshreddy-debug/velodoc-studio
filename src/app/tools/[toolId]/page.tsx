import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { TOOLS } from "@/lib/constants";
import { ToolWorkspaceView } from "@/components/tools/ToolWorkspaceView";

interface PageProps {
  params: {
    toolId: string;
  };
}

export async function generateStaticParams() {
  return TOOLS.map((tool) => ({
    toolId: tool.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tool = TOOLS.find((t) => t.id === params.toolId);
  if (!tool) {
    return {
      title: "Tool Not Found | VeloDoc Studio",
    };
  }

  return {
    title: `${tool.name} — VeloDoc Studio`,
    description: tool.description,
  };
}

export default function ToolPage({ params }: PageProps) {
  const tool = TOOLS.find((t) => t.id === params.toolId);

  if (!tool) {
    notFound();
  }

  return <ToolWorkspaceView tool={tool} />;
}
