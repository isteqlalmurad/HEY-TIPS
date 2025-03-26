// app/home/page.tsx
"use client";

import { useState } from "react";
import { Tabs, Tab } from "@nextui-org/react";
import ChatMode from "@/components/ChatMode";
import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="w-screen flex flex-col">
      <div className="w-[900px] flex flex-col items-start justify-start gap-5 mx-auto pt-4 pb-20">
        <Tabs 
          aria-label="Conversation Modes" 
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key.toString())}
          className="w-full"
        >
          <Tab key="chat" title="Chat Mode">
            <div className="mt-4 w-full">
              <ChatMode />
            </div>
          </Tab>
          <Tab key="avatar" title="Real-time Conversation Mode">
            <div className="mt-4 w-full">
              <InteractiveAvatar />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}