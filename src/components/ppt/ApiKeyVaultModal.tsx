"use client";

import React, { useState, useEffect } from "react";
import { ApiVaultConfig, AiProviderId } from "@/types/ppt";
import {
  Key,
  ShieldCheck,
  CheckCircle,
  X,
  ExternalLink,
  Sparkles,
  Cpu,
  Lock,
} from "lucide-react";

interface ApiKeyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiVaultConfig;
  onSaveConfig: (newConfig: ApiVaultConfig) => void;
}

export function ApiKeyVaultModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: ApiKeyVaultModalProps) {
  const [provider, setProvider] = useState<AiProviderId>(config.provider);
  const [geminiKey, setGeminiKey] = useState(config.geminiKey || "");
  const [groqKey, setGroqKey] = useState(config.groqKey || "");
  const [openaiKey, setOpenaiKey] = useState(config.openaiKey || "");
  const [openrouterKey, setOpenrouterKey] = useState(config.openrouterKey || "");
  const [customModelId, setCustomModelId] = useState(config.customModelId || "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setProvider(config.provider);
    setGeminiKey(config.geminiKey || "");
    setGroqKey(config.groqKey || "");
    setOpenaiKey(config.openaiKey || "");
    setOpenrouterKey(config.openrouterKey || "");
    setCustomModelId(config.customModelId || "");
  }, [config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      provider,
      geminiKey: geminiKey.trim(),
      groqKey: groqKey.trim(),
      openaiKey: openaiKey.trim(),
      openrouterKey: openrouterKey.trim(),
      customModelId: customModelId.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg premium-card p-6 rounded-3xl border border-white/[0.12] bg-[#0A0D18] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                AI Engine &amp; API Key Vault
              </h3>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                100% Stored locally in your browser
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Select Generation Engine
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "zero-key", label: "Zero-Key (Free)", icon: Sparkles },
              { id: "gemini", label: "Google Gemini", icon: Cpu },
              { id: "groq", label: "Groq Cloud (Ultra-Fast)", icon: Cpu },
              { id: "openai", label: "OpenAI GPT-4o", icon: Cpu },
              { id: "openrouter", label: "OpenRouter", icon: Cpu },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as AiProviderId)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.14]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-1 text-indigo-400" />
                  <span className="text-[11px] block truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Inputs Based on Provider */}
        <div className="space-y-3.5 pt-1">
          {provider === "zero-key" && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Zero Setup Instant Mode Active
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Uses our free keyless AI synthesis endpoint paired with an on-device deterministic Tech-Talk synthesis fallback. Works immediately with 0 accounts or setup required!
              </p>
            </div>
          )}

          {provider === "gemini" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Google Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
          )}

          {provider === "groq" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Groq API Key (Llama 3.3 70B)</label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
          )}

          {provider === "openai" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">OpenAI API Key (GPT-4o Mini)</label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  API dashboard <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
          )}

          {provider === "openrouter" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">OpenRouter API Key</label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Get key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Custom Model ID (Optional)</label>
                <input
                  type="text"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder="meta-llama/llama-3.3-70b-instruct"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer"
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Vault Settings Saved!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Vault Preferences Locally</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
