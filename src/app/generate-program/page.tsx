"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { vapi } from "@/lib/vapi";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const GenerateProgramPage = () => {
  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [callEnded, setCallEnded] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const messageContainerRef = useRef<HTMLDivElement>(null);

  // SOLUTION to get rid of "Meeting has ended" error
  useEffect(() => {
    const originalError = console.error;
    // override console.error to ignore "Meeting has ended" errors
    console.error = function (msg, ...args) {
      if (
        msg &&
        (msg.includes("Meeting has ended") ||
          (args[0] && args[0].toString().includes("Meeting has ended")))
      ) {
        console.log("Ignoring known error: Meeting has ended");
        return; // don't pass to original handler
      }

      // pass all other errors to the original handler
      return originalError.call(console, msg, ...args);
    };

    // restore original handler on unmount
    return () => {
      console.error = originalError;
    };
  }, []);

  // auto-scroll messages
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // navigate user to profile page after the call ends
  useEffect(() => {
    if (callEnded) {
      const redirectTimer = setTimeout(() => {
        router.push("/profile");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [callEnded, router]);

  // setup event listeners for vapi
  useEffect(() => {
    const handleCallStart = () => {
      console.log("Call started");
      setConnecting(false);
      setCallActive(true);
      setCallEnded(false);
    };

    const handleCallEnd = () => {
      console.log("Call ended");
      setCallActive(false);
      setConnecting(false);
      setIsSpeaking(false);
      setCallEnded(true);
    };

    const handleSpeechStart = () => {
      console.log("AI started Speaking");
      setIsSpeaking(true);
    };

    const handleSpeechEnd = () => {
      console.log("AI stopped Speaking");
      setIsSpeaking(false);
    };
    const handleMessage = (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { content: message.transcript, role: message.role };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleError = (error: any) => {
      console.log("Vapi Error", error);
      setConnecting(false);
      setCallActive(false);
    };

    vapi
      .on("call-start", handleCallStart)
      .on("call-end", handleCallEnd)
      .on("speech-start", handleSpeechStart)
      .on("speech-end", handleSpeechEnd)
      .on("message", handleMessage)
      .on("error", handleError);

    // cleanup event listeners on unmount
    return () => {
      vapi
        .off("call-start", handleCallStart)
        .off("call-end", handleCallEnd)
        .off("speech-start", handleSpeechStart)
        .off("speech-end", handleSpeechEnd)
        .off("message", handleMessage)
        .off("error", handleError);
    };
  }, []);

  const toggleCall = async () => {
    if (callActive) vapi.stop();
    else {
      try {
        setConnecting(true);
        setMessages([]);
        setCallEnded(false);

        const fullName = user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "There";

        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
          variableValues: {
            full_name: fullName,
            user_id: user?.id,
          },
        });
      } catch (error) {
        console.log("Failed to start call", error);
        setConnecting(false);
      }
    }
  };

  return (
    <div className="flex flex-col pt-24 pb-6 min-h-screen overflow-hidden text-foreground">
      <div className="mx-auto px-4 max-w-5xl h-full container">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="font-mono font-bold text-3xl">
            <span>Generate Your </span>
            <span className="text-primary uppercase">Fitness Program</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Have a voice conversation with our AI assistant to create your
            personalized plan
          </p>
        </div>

        {/* VIDEO CALL AREA */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mb-8">
          {/* AI ASSISTANT CARD */}
          <Card className="relative bg-card/90 backdrop-blur-sm border border-border overflow-hidden">
            <div className="relative flex flex-col justify-center items-center p-6 aspect-video">
              {/* AI VOICE ANIMATION */}
              <div
                className={`absolute inset-0 ${
                  isSpeaking ? "opacity-30" : "opacity-0"
                } transition-opacity duration-300`}>
                {/* Voice wave animation when speaking */}
                <div className="top-1/2 right-0 left-0 absolute flex justify-center items-center h-20 -translate-y-1/2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`mx-1 h-16 w-1 bg-primary rounded-full ${
                        isSpeaking ? "animate-sound-wave" : ""
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: isSpeaking
                          ? `${Math.random() * 50 + 20}%`
                          : "5%",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI IMAGE */}
              <div className="relative mb-4 size-32">
                <div
                  className={`absolute inset-0 bg-primary opacity-10 rounded-full blur-lg ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                />

                <div className="relative flex justify-center items-center bg-card border border-border rounded-full w-full h-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-secondary/10"></div>
                  <img
                    src="/ai-avatar.png"
                    alt="AI Assistant"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h2 className="font-bold text-foreground text-xl">CodeFlex AI</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Fitness & Diet Coach
              </p>

              {/* SPEAKING INDICATOR */}

              <div
                className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border ${
                  isSpeaking ? "border-primary" : ""
                }`}>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? "bg-primary animate-pulse" : "bg-muted"
                  }`}
                />

                <span className="text-muted-foreground text-xs">
                  {isSpeaking
                    ? "Speaking..."
                    : callActive
                      ? "Listening..."
                      : callEnded
                        ? "Redirecting to profile..."
                        : "Waiting..."}
                </span>
              </div>
            </div>
          </Card>

          {/* USER CARD */}
          <Card
            className={`bg-card/90 backdrop-blur-sm border overflow-hidden relative`}>
            <div className="relative flex flex-col justify-center items-center p-6 aspect-video">
              {/* User Image */}
              <div className="relative mb-4 size-32">
                <img
                  src={user?.imageUrl}
                  alt="User"
                  // ADD THIS "size-full" class to make it rounded on all images
                  className="rounded-full size-full object-cover"
                />
              </div>

              <h2 className="font-bold text-foreground text-xl">You</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {user
                  ? (user.firstName + " " + (user.lastName || "")).trim()
                  : "Guest"}
              </p>

              {/* User Ready Text */}
              <div
                className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-card border`}>
                <div className={`w-2 h-2 rounded-full bg-muted`} />
                <span className="text-muted-foreground text-xs">Ready</span>
              </div>
            </div>
          </Card>
        </div>

        {/* MESSAGE COINTER  */}
        {messages.length > 0 && (
          <div
            ref={messageContainerRef}
            className="bg-card/90 backdrop-blur-sm mb-8 p-4 border border-border rounded-xl w-full h-64 overflow-y-auto transition-all duration-300 scroll-smooth">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className="animate-fadeIn message-item">
                  <div className="mb-1 font-semibold text-muted-foreground text-xs">
                    {msg.role === "assistant" ? "CodeFlex AI" : "You"}:
                  </div>
                  <p className="text-foreground">{msg.content}</p>
                </div>
              ))}

              {callEnded && (
                <div className="animate-fadeIn message-item">
                  <div className="mb-1 font-semibold text-primary text-xs">
                    System:
                  </div>
                  <p className="text-foreground">
                    Your fitness program has been created! Redirecting to your
                    profile...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALL CONTROLS */}
        <div className="flex justify-center gap-4 w-full">
          <Button
            className={`w-40 text-xl rounded-3xl ${
              callActive
                ? "bg-destructive hover:bg-destructive/90"
                : callEnded
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-primary hover:bg-primary/90"
            } text-white relative`}
            onClick={toggleCall}
            disabled={connecting || callEnded}>
            {connecting && (
              <span className="absolute inset-0 bg-primary/50 opacity-75 rounded-full animate-ping"></span>
            )}

            <span>
              {callActive
                ? "End Call"
                : connecting
                  ? "Connecting..."
                  : callEnded
                    ? "View Profile"
                    : "Start Call"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
export default GenerateProgramPage;
