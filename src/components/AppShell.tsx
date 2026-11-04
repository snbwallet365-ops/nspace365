"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { StoreProvider, useStore } from "@/components/store";
import TopBar from "@/components/shell/TopBar";
import TabBar from "@/components/shell/TabBar";
import { LaunchOverlay, Toasts } from "@/components/shell/Overlays";
import TodayView from "@/components/views/TodayView";
import CategoryView from "@/components/views/CategoryView";
import SearchView from "@/components/views/SearchView";
import GitHubView from "@/components/views/GitHubView";
import BuildView from "@/components/views/BuildView";
import AccountView from "@/components/views/AccountView";
import ConnectionsView from "@/components/views/ConnectionsView";
import SkillsView from "@/components/views/SkillsView";
import KnowledgeView from "@/components/views/KnowledgeView";
import McpView from "@/components/views/McpView";
import BrowserView from "@/components/views/BrowserView";
import type { View } from "@/components/store";
import AppSheet from "@/components/sheets/AppSheet";
import AccountModal from "@/components/sheets/AccountModal";
import SettingsSheet from "@/components/sheets/SettingsSheet";
import BrowserSheet from "@/components/sheets/BrowserSheet";
import Onboarding from "@/components/onboarding/Onboarding";

function Screen() {
  const { view, loading } = useStore();
  const isChat = view === "ai";
  const isFull = isChat;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden bg-white" style={{ height: "100dvh", minHeight: "100dvh" }}>
      {!isFull && <TopBar onOpenSettings={() => setSettingsOpen(true)} />}
      <main className={`relative min-h-0 flex-1 scroll-smooth ${isChat ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={isFull ? "h-full" : "mx-auto w-full max-w-6xl px-4 pb-[calc(var(--safe-bottom)+6.5rem)] md:px-8"}
          >
            {loading && !isChat ? (
              <div className="space-y-4 pt-8">
                <div className="h-10 w-40 animate-pulse rounded-xl bg-[#F2F2F7]" />
                <div className="h-[420px] animate-pulse rounded-3xl bg-[#F2F2F7]" />
                <div className="h-20 animate-pulse rounded-2xl bg-[#F2F2F7]" />
              </div>
            ) : view === "today" ? (
              <TodayView />
            ) : view === "apps" ? (
              <CategoryView category="apps" />
            ) : view === "search" ? (
              <SearchView />
            ) : view === "github" ? (
              <GitHubView />
            ) : view === "account" ? (
              <AccountView />
            ) : view === "connections" ? (
              <ConnectionsView />
            ) : view === "skills" ? (
              <SkillsView />
            ) : view === "knowledge" ? (
              <KnowledgeView />
            ) : view === "mcp" ? (
              <McpView />
            ) : view === "browser" ? (
              <BrowserView />
            ) : (
              <BuildView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      {!isFull && <TabBar onOpenKeys={() => setSettingsOpen(true)} />}
      <AppSheet />
      <AccountModal />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <BrowserSheet />
      <Toasts />
      <LaunchOverlay />
    </div>
  );
}

export default function AppShell({ initialView = "today" }: { initialView?: View }) {
  return (
    <StoreProvider initialView={initialView}>
      <Onboarding>
        <Screen />
      </Onboarding>
    </StoreProvider>
  );
}
