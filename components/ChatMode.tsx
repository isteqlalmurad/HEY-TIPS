"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, CardBody, CardFooter, Divider, Spinner, Avatar } from "@nextui-org/react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit() {
    if (input.trim() === "") return;

    // Add user message to chat
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare conversation history for the API
      const conversationHistory = [
        ...messages,
        userMessage
      ].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Python backend API directly to get response
      const response = await fetch("http://localhost:8000/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Save session ID if this is first message
      if (!sessionId) {
        setSessionId(data.session_id);
      }

      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error getting response:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardBody className="flex-grow overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              Start a conversation by sending a message
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar
                    className={message.role === "user" ? "bg-indigo-500" : "bg-gray-500"}
                    size="sm"
                    name={message.role === "user" ? "You" : "AI"}
                  />
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[80%]">
                <Avatar className="bg-gray-500" size="sm" name="AI" />
                <div className="rounded-lg p-3 bg-gray-200 dark:bg-gray-700">
                  <Spinner size="sm" color="default" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardBody>
      <Divider />
      <CardFooter>
        <InteractiveAvatarTextInput
          input={input}
          label="Message"
          loading={isLoading}
          placeholder="Type your message..."
          setInput={setInput}
          onSubmit={handleSubmit}
        />
      </CardFooter>
    </Card>
  );
}