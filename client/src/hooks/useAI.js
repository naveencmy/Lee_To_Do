// ═══════════════════════════════════════════════════════════════
// useAI Hook — AI Assistant state with text and voice input
// ═══════════════════════════════════════════════════════════════
import { useState, useRef, useCallback } from 'react';
import { aiApi } from '../utils/api.js';

export function useAI(onMutation) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Hey! 👋 I\'m **Lee**, your AI task assistant. Try commands like:\n\n• "Add a task to submit ML assignment by Friday"\n• "Move the database project to urgent"\n• "Give me my weekly summary"\n• "What tasks are overdue?"\n\nI can also listen to your voice! 🎙️',
      type: 'conversation',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // ── Send a text message ──
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text, type: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await aiApi.chat(text);

      if (response.type === 'mutation') {
        const botMsg = {
          role: 'bot',
          content: response.message,
          type: 'mutation',
        };
        setMessages((prev) => [...prev, botMsg]);
        // Trigger task refresh in parent
        if (onMutation) onMutation();
      } else {
        const botMsg = {
          role: 'bot',
          content: response.message,
          type: 'conversation',
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      const errorMsg = {
        role: 'bot',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        type: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onMutation]);

  // ── Voice Input using Web Speech API ──
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: '🎙️ Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.',
          type: 'conversation',
        },
      ]);
      return;
    }

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript.trim()) {
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error !== 'aborted') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `🎙️ Voice recognition error: ${event.error}. Please try again.`,
            type: 'conversation',
          },
        ]);
      }
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, sendMessage]);

  // ── Clear messages ──
  const clearMessages = useCallback(() => {
    setMessages([
      {
        role: 'bot',
        content: 'Chat cleared! How can I help you? 😊',
        type: 'conversation',
      },
    ]);
  }, []);

  return {
    messages,
    isLoading,
    isRecording,
    sendMessage,
    startVoiceInput,
    clearMessages,
  };
}
