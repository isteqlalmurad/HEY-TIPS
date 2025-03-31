// components/ChatMode.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, CardBody, CardFooter, Divider, Spinner, Avatar } from "@nextui-org/react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import PatientSelection from "./PatientSelection";
import PatientSidebar from "./PatientSidebar";
import { Patient } from "@/app/lib/patients";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ChatMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    // Initialize messages with system message
    setMessages([
      { role: "system", content: patient.systemMessage }
    ]);
    setSessionId(null); // Reset session ID for new patient
  };

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

  // If no patient is selected, show patient selection
  if (!selectedPatient) {
    return (
      <Card className="w-full h-[700px] flex flex-col">
        <CardBody className="flex-grow p-4">
          <PatientSelection onSelectPatient={handleSelectPatient} />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[700px] flex flex-col">
      <CardBody className="flex-grow p-0">
        <div className="flex h-full">
          {/* Main chat area - 80% width */}
          <div className="w-[80%] h-full flex flex-col">
            <div className="flex-grow overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                {messages.filter(msg => msg.role !== "system").length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">
                    Start a conversation with {selectedPatient.name} by sending a message
                  </div>
                ) : (
                  messages.filter(msg => msg.role !== "system").map((message, index) => (
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
  style={{ width: "40px", height: "40px" }}
  className={`${message.role === "user" ? "bg-indigo-500" : "bg-gray-500"} flex-shrink-0`}
  name={message.role === "user" ? "You" : selectedPatient.name}
  src={message.role === "assistant" ? selectedPatient.imagePath : undefined}
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
                      <Avatar 
                        className="bg-gray-500" 
                        size="sm" 
                        name={selectedPatient.name}
                        src={selectedPatient.imagePath} 
                      />
                      <div className="rounded-lg p-3 bg-gray-200 dark:bg-gray-700">
                        <Spinner size="sm" color="default" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <Divider />
            
            <div className="p-2">
              <InteractiveAvatarTextInput
                input={input}
                label={`Message ${selectedPatient.name}`}
                loading={isLoading}
                placeholder="Type your message..."
                setInput={setInput}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
          
          {/* Patient sidebar - 20% width */}
          <div className="w-[40%] border-l border-divider">
            <PatientSidebar patient={selectedPatient} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}