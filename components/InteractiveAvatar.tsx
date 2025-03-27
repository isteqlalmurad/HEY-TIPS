// components/InteractiveAvatar.tsx
import type { StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Progress,
  Avatar,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";

import { STT_LANGUAGE_LIST } from "@/app/lib/constants";
import { PATIENTS, Patient } from "@/app/lib/patients";
import PatientSelection from "./PatientSelection";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(900); // 15 minutes in seconds
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [data, setData] = useState<StartAvatarResponse>();
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);

  // Handle patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    // Set avatar ID from patient data
    setAvatarId(patient.avatarId);
    // Initialize messages with system message
    setMessages([
      { role: "system", content: patient.systemMessage }
    ]);
    setSessionId(null); // Reset session ID for new patient
  };

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    if (!selectedPatient) {
      setDebug("No patient selected");
      return;
    }

    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();
    
    // Pre-check microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks after permission check
      setMicPermission(true);
      setDebug("Microphone permission granted");
    } catch (err) {
      console.error("Microphone permission error:", err);
      setMicPermission(false);
      setDebug("Microphone permission denied: " + String(err));
    }

    // Initialize session ID for OpenAI conversation
    try {
      const response = await fetch("http://localhost:8000/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
          session_id: null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
        console.log("Session ID created:", data.session_id);
      }
    } catch (error) {
      console.error("Error initializing OpenAI session:", error);
      setDebug("Error initializing OpenAI session: " + String(error));
    }

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    
    // Set up event listeners
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    
    avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("Stream ready:", event.detail);
      setStream(event.detail);
    });
    
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.2,
          emotion: VoiceEmotion.NEUTRAL,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      
      // Start session timer
      setSessionTimeRemaining(900); // 15 minutes
      startSessionTimer();
      
      // Welcome message
      setTimeout(async () => {
        if (avatar.current) {
          await avatar.current.speak({ 
            text: `Hello! I'm ${selectedPatient.name}. I'm here to discuss my health concerns with you. This session will last for 15 minutes. Use the microphone button to speak, and I'll respond.`, 
            taskType: TaskType.REPEAT, 
            taskMode: TaskMode.SYNC 
          });
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug("Error starting avatar session: " + String(error));
    } finally {
      setIsLoadingSession(false);
    }
  }
  
  // Manual recording functions
  function startRecording() {
    setIsUserTalking(true);
    setDebug("Recording audio... (Microphone button pressed)");
    console.log("Recording started"); // Debug: Log to console
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("Microphone access granted"); // Debug: Log successful microphone access
          recordedChunks.current = [];
          mediaRecorder.current = new MediaRecorder(stream);
          
          mediaRecorder.current.ondataavailable = (e) => {
            console.log("Data available event triggered"); // Debug: Log data event
            if (e.data.size > 0) {
              recordedChunks.current.push(e.data);
              console.log("Recorded chunk added, size:", e.data.size); // Debug: Log chunk size
            }
          };
          
          // Set dataavailable to fire every second for better responsiveness
          mediaRecorder.current.start(1000);
          console.log("MediaRecorder started"); // Debug: Log recorder started
        })
        .catch(err => {
          console.error("Error accessing microphone:", err);
          setDebug("Error accessing microphone: " + err.message);
          setIsUserTalking(false);
        });
    } else {
      console.error("MediaDevices not supported");
      setDebug("Your browser does not support audio recording");
      setIsUserTalking(false);
    }
  }

  function stopRecording() {
    setIsUserTalking(false);
    setDebug("Recording stopped. Processing audio..."); 
    console.log("Stop recording called"); // Debug: Log stop event
    
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      console.log("Media recorder state before stop:", mediaRecorder.current.state); // Debug: Log recorder state
      
      // Set up onstop handler before calling stop
      mediaRecorder.current.onstop = async () => {
        console.log("MediaRecorder stop event handler triggered"); // Debug: Log stop handler
        try {
          setIsProcessing(true);
          setDebug("Processing audio...");
          
          // Create audio blob from recorded chunks
          const audioBlob = new Blob(recordedChunks.current, { type: 'audio/webm' });
          
          // Create a FormData object to send the audio file
          const formData = new FormData();
          formData.append('audio', audioBlob, 'user_audio.webm');
          
          if (sessionId) {
            formData.append('session_id', sessionId);
          }
          
          // Send audio to Python backend for transcription with Whisper
          const transcriptionResponse = await fetch("http://localhost:8000/transcribe-audio", {
            method: "POST",
            body: formData,
          });
          
          if (!transcriptionResponse.ok) {
            throw new Error(`Transcription error: ${transcriptionResponse.status}`);
          }
          
          const transcriptionData = await transcriptionResponse.json();
          const text = transcriptionData.transcription;
          
          // Display the transcribed text
          setTranscription(text);
          setDebug(`Transcribed: ${text}`);
          
          // Process with OpenAI without having the avatar repeat what was said
          if (text && text.trim()) {
            await processUserInput(text);
          } else {
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("Error processing audio:", error);
          setDebug(`Error processing audio: ${error instanceof Error ? error.message : String(error)}`);
          setIsProcessing(false);
        }
      };
      
      mediaRecorder.current.stop();
    }
  }

async function processUserInput(userInput: string) {
  if (!userInput.trim()) return;
  
  try {
    setDebug(`Processing: "${userInput}" with OpenAI...`);
    
    // Add user message to chat history for OpenAI context
    const userMessage = { role: "user" as const, content: userInput };
    setMessages(prev => [...prev, userMessage]);
    
    // Prepare conversation history for the API
    const conversationHistory = [
      ...messages,
      userMessage
    ];
    
    // Set up streaming response using the existing generate-response endpoint with stream=true
    const response = await fetch("http://localhost:8000/generate-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        session_id: sessionId,
        stream: true  // Enable streaming
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Create a reader to read the streaming response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let aiResponseChunks: string[] = [];
    let currentChunk = "";
    let fullResponse = "";
    let isFirstChunk = true;
    
    // Set up a queue for chunks to be spoken
    const chunkQueue: string[] = [];
    let isProcessingQueue = false;
    
    // Function to process chunks in the queue
    async function processChunkQueue() {
      if (isProcessingQueue || chunkQueue.length === 0) return;
      
      isProcessingQueue = true;
      
      while (chunkQueue.length > 0) {
        const chunk = chunkQueue.shift()!;
        
        if (chunk.trim() && avatar.current) {
          try {
            // Use ASYNC mode for smoother delivery after the first chunk
            await avatar.current.speak({
              text: chunk,
              taskType: TaskType.REPEAT,
              taskMode: isFirstChunk ? TaskMode.SYNC : TaskMode.ASYNC
            });
            
            isFirstChunk = false;
          } catch (error) {
            console.error("Error speaking chunk:", error);
          }
        }
      }
      
      isProcessingQueue = false;
    }
    
    // Function to process the stream of chunks
    async function processStream() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Add any remaining text as a final chunk
            if (currentChunk.trim()) {
              chunkQueue.push(currentChunk);
              processChunkQueue();
            }
            break;
          }
          
          // Decode the chunk
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              const textChunk = data.chunk;
              
              if (textChunk) {
                fullResponse += textChunk;
                currentChunk += textChunk;
                
                // Chunk the text at natural boundaries:
                // 1. After a reasonable length (15+ chars) AND
                // 2. At a sentence boundary or punctuation, OR
                // 3. If the chunk is getting too long (50+ chars)
                if ((currentChunk.length >= 15 && 
                     (currentChunk.endsWith('.') || 
                      currentChunk.endsWith('!') || 
                      currentChunk.endsWith('?') || 
                      currentChunk.endsWith(':') ||
                      currentChunk.endsWith(','))) || 
                    currentChunk.length >= 50) {
                  
                  chunkQueue.push(currentChunk);
                  currentChunk = "";
                  
                  // Start processing the queue if not already doing so
                  if (!isProcessingQueue) {
                    processChunkQueue();
                  }
                }
              }
            } catch (error) {
              console.error("Error parsing JSON chunk:", error);
            }
          }
        }
        
        // Update messages with the complete AI response
        setMessages(prev => [...prev, { role: "assistant", content: fullResponse }]);
        setDebug(`Finished streaming response: ${fullResponse.substring(0, 50)}...`);
        
      } catch (error) {
        console.error("Error in stream processing:", error);
        throw error;
      }
    }
    
    // Start processing the stream
    await processStream();
    
  } catch (error) {
    console.error("Error processing user input:", error);
    setDebug(`Error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Provide error feedback through avatar
    if (avatar.current) {
      await avatar.current.speak({
        text: "I'm sorry, I encountered an error processing your request.",
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC
      });
    }
  } finally {
    setIsProcessing(false);
  }
}

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }
  
  function startSessionTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setSessionTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up, end session
          if (timerRef.current) clearInterval(timerRef.current);
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  
  function formatTimeRemaining(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  async function endSession() {
    // Stop media recorder if active
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    await avatar.current?.stopAvatar();
    setStream(undefined);
    setSessionTimeRemaining(900);
    setTranscription("");
    
    // Keep the selected patient, but reset messages to just the system message
    if (selectedPatient) {
      setMessages([
        { role: "system", content: selectedPatient.systemMessage }
      ]);
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Stop media recorder if active
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing avatar stream");
      };
    }
  }, [mediaStream, stream]);

  const sessionProgressPercent = (sessionTimeRemaining / 900) * 100;

  // If no patient is selected, show patient selection
  if (!selectedPatient) {
    return (
      <div className="w-full flex flex-col gap-4">
        <Card>
          <CardBody className="h-[700px] flex flex-col p-4">
            <PatientSelection onSelectPatient={handleSelectPatient} />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[700px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden relative">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              
              {/* Patient info header */}
              <div className="absolute top-3 left-0 right-0 px-4">
                <div className="flex items-center gap-2 bg-black/50 text-white p-2 rounded-lg mb-2">
                  <Avatar
                    src={selectedPatient.imagePath}
                    className="w-8 h-8"
                    fallback={selectedPatient.name.charAt(0)}
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{selectedPatient.name}</p>
                    <p className="text-xs">{selectedPatient.age} years, {selectedPatient.ethnicity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs">Session time: {formatTimeRemaining(sessionTimeRemaining)}</p>
                    <Progress 
                      color="primary" 
                      value={sessionProgressPercent} 
                      className="w-full mt-1" 
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Transcription display */}
              {transcription && (
                <div className="absolute top-20 left-0 right-0 px-4 py-2 bg-black/50 text-white">
                  <p className="text-sm font-bold">You said:</p>
                  <p className="text-base">{transcription}</p>
                </div>
              )}
              
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <div className="flex flex-col gap-4 w-full">
                {/* Patient info display */}
                <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Avatar
                    src={selectedPatient.imagePath}
                    className="w-16 h-16"
                    fallback={selectedPatient.name.charAt(0)}
                  />
                  <div>
                    <h3 className="font-bold text-xl">{selectedPatient.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedPatient.age} years, {selectedPatient.ethnicity}
                    </p>
                    <p className="mt-1">{selectedPatient.shortDescription}</p>
                  </div>
                </div>
                
                <p className="text-sm font-medium leading-none">
                  Custom Knowledge ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom knowledge ID"
                  value={knowledgeId}
                  onChange={(e) => setKnowledgeId(e.target.value)}
                />
                
                <p className="text-sm font-medium leading-none">
                  Avatar Selection
                </p>
                {/* Avatar is pre-selected based on patient data */}
                <Input
                  placeholder="Avatar ID"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                  endContent={
                    <Button 
                      size="sm" 
                      color="default" 
                      variant="flat" 
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change Patient
                    </Button>
                  }
                />
                
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start 15-minute session with {selectedPatient.name}
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex justify-center items-center">
          <div className="flex flex-col items-center gap-2">
            {stream && (
              <>
                {isUserTalking ? (
                  <Button
                    className="bg-gradient-to-tr from-red-500 to-red-300 text-white rounded-full h-16 w-16"
                    size="lg"
                    isIconOnly
                    onClick={stopRecording}
                    disabled={isProcessing}
                  >
                    <span className="text-2xl">⏹️</span>
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-tr from-pink-500 to-pink-300 text-white rounded-full h-16 w-16"
                    size="lg"
                    isIconOnly
                    onClick={startRecording}
                    disabled={isProcessing}
                  >
                    <span className="text-2xl">🎤</span>
                  </Button>
                )}
              </>
            )}
            <div className="text-center">
              {micPermission === false && (
                <Chip color="danger" className="px-4">Microphone permission denied</Chip>
              )}
              {isUserTalking ? (
                <Chip color="primary" className="px-4">Listening...</Chip>
              ) : isProcessing ? (
                <Chip color="warning" className="px-4">Processing response...</Chip>
              ) : stream ? (
                <p className="text-sm text-gray-500">Click to start/stop recording</p>
              ) : (
                <p className="text-sm text-gray-500">Start a session to begin</p>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
      <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p>
    </div>
  );
}