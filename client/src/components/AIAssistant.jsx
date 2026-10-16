// ═══════════════════════════════════════════════════════════════
// AIAssistant.jsx — Terminal Co-Pilot with Gemini-Style Presentation
// Real animated SVG icons, structured metric pills, task cards & prompt chips
// ═══════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
import { useAI } from '../hooks/useAI.js';
import ReactMarkdown from 'react-markdown';
import {
  FloatAiIcon,
  SparklesIcon,
  TrashIcon,
  CloseIcon,
  SendIcon,
  MicIcon,
  CopyIcon,
  CheckIcon,
  FlameIcon,
  ActivityIcon,
  AlertIcon,
  KanbanIcon,
  CalendarIcon,
  RefreshIcon,
} from './AnimatedIcons.jsx';

// ── Quick Suggestion Chips ──
const PROMPT_CHIPS = [
  { label: 'Board Summary', query: 'Give me a complete summary of my board state and statistics.' },
  { label: 'Urgent Tasks', query: 'Show all my urgent tasks and what needs immediate attention.' },
  { label: 'Next Priority', query: 'What is my top priority task to work on right now?' },
  { label: 'Check Overdue', query: 'Are there any overdue tasks on my board?' },
  { label: 'Add Task', query: 'Add a task to review operating systems chapter 4 by Friday in urgent' },
];

// ── Gemini-style Bot Message Renderer ──
function GeminiMessageContent({ content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="gemini-body">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="gemini-heading">{children}</h3>,
          h2: ({ children }) => <h3 className="gemini-heading">{children}</h3>,
          h3: ({ children }) => {
            const text = String(children).toLowerCase();
            let modifier = '';
            if (text.includes('urgent')) modifier = 'gemini-heading--urgent';
            else if (text.includes('progress')) modifier = 'gemini-heading--progress';
            else if (text.includes('block')) modifier = 'gemini-heading--blocked';
            else if (text.includes('to-do') || text.includes('todo')) modifier = 'gemini-heading--todo';
            return <div className={`gemini-heading ${modifier}`}>{children}</div>;
          },
          p: ({ children }) => {
            const raw = String(children);
            // Check if paragraph is an overview metric bar (e.g. Active: 13 • Urgent: 2 ...)
            if (raw.includes('Active:') || (raw.includes('Active') && raw.includes('Completed'))) {
              const pills = raw.split(/[•|]/).map(s => s.trim()).filter(Boolean);
              if (pills.length >= 2) {
                return (
                  <div className="gemini-stat-bar">
                    {pills.map((p, i) => (
                      <span key={i} className="gemini-stat-pill">
                        {p.toLowerCase().includes('urgent') ? '' :
                          p.toLowerCase().includes('overdue') ? '' :
                            p.toLowerCase().includes('completed') ? '' :
                              p.toLowerCase().includes('progress') ? '' : ''} {p.replace(/\*\*/g, '')}
                      </span>
                    ))}
                  </div>
                );
              }
            }
            return <p style={{ margin: '4px 0', lineHeight: 1.55 }}>{children}</p>;
          },
          blockquote: ({ children }) => (
            <div className="gemini-insight-box">
              {children}
            </div>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table className="gemini-table">{children}</table>
            </div>
          ),
          ul: ({ children }) => <ul style={{ paddingLeft: '14px', margin: '4px 0' }}>{children}</ul>,
          li: ({ children }) => {
            const text = String(children);
            // If bullet point has a due date or column tag, render as sleek task item
            if (text.includes('Due:') || text.includes('due:') || text.includes('Daily') || text.includes('Weekly')) {
              return (
                <div className="gemini-task-card">
                  <div>
                    <div className="gemini-task-card__title">
                      {children}
                    </div>
                  </div>
                </div>
              );
            }
            return <li style={{ margin: '3px 0' }}>{children}</li>;
          },
          code: ({ children }) => (
            <code style={{
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-subtle)',
              padding: '1px 5px',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--term-green)'
            }}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Action Footer */}
      <div className="ai-message__footer">
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FloatAiIcon size={13} /> Float AI
        </span>
        <button
          className="ai-message__copy-btn"
          onClick={handleCopy}
          title="Copy markdown response"
        >
          {copied ? (
            <>
              <CheckIcon size={12} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AIAssistant({ onMutation, showToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages,
    isLoading,
    isRecording,
    sendMessage,
    startVoiceInput,
    clearMessages,
  } = useAI(onMutation);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (query) => {
    sendMessage(query);
  };

  if (!isOpen) {
    return (
      <button
        className="ai-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Co-Pilot"
        id="ai-fab"
        title="Open Float AI Terminal Co-Pilot"
      >
        <FloatAiIcon size={24} />
      </button>
    );
  }

  return (
    <div className="ai-panel term-window" id="ai-panel">
      {/* Terminal Titlebar Header */}
      <div className="ai-panel__header">
        <div className="ai-panel__header-left">
          <div className="term-window__controls">
            <span className="term-dot term-dot--red" onClick={() => setIsOpen(false)} />
            <span className="term-dot term-dot--yellow" />
            <span className="term-dot term-dot--green" />
          </div>
          <div>
            <div className="ai-panel__name">
              <FloatAiIcon size={14} className="ai-panel__brand-icon" />
              <span>LEE_COPILOT</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="task-card__action-btn"
            onClick={clearMessages}
            title="Clear message history"
            aria-label="Clear chat"
          >
            <TrashIcon size={14} />
          </button>
          <button
            className="task-card__action-btn"
            onClick={() => setIsOpen(false)}
            title="Minimize panel"
            aria-label="Minimize"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="ai-panel__messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`ai-message ${msg.role === 'user'
              ? 'ai-message--user'
              : msg.type === 'mutation'
                ? 'ai-message--mutation'
                : 'ai-message--bot'
              }`}
          >
            {msg.role === 'user' ? (
              <div className="ai-user-prompt">
                <span className="ai-user-prompt__indicator">$</span>
                <span className="ai-user-prompt__text">{msg.content}</span>
              </div>
            ) : msg.type === 'mutation' ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚡ TASK MODIFIED:</div>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <GeminiMessageContent content={msg.content} />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="ai-message ai-message--loading ai-float-loader">
            <div className="ai-float-loader__orb">
              <FloatAiIcon size={18} className="ai-float-loader__spin" />
            </div>
            <div className="ai-float-loader__body">
              <div className="ai-float-loader__headline">
                <span className="ai-float-loader__label">Float AI in progress</span>
                <span className="ai-float-loader__cursor">_</span>
              </div>
              <div className="ai-float-loader__signal">
                <span className="signal-bar bar-1" />
                <span className="signal-bar bar-2" />
                <span className="signal-bar bar-3" />
                <span className="signal-bar bar-4" />
                <span className="signal-bar bar-5" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="ai-prompt-chips">
        {PROMPT_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            className="ai-prompt-chip"
            onClick={() => handleChipClick(chip.query)}
            disabled={isLoading}
          >
            <span>›</span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="ai-panel__input">
        <span style={{ color: 'var(--term-green)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>&gt;</span>

        {/* Voice Input Button */}
        <button
          type="button"
          className={`ai-panel__voice-btn ${isRecording ? 'ai-panel__voice-btn--recording' : ''}`}
          onClick={startVoiceInput}
          title={isRecording ? 'Stop voice recording' : 'Start voice input'}
          aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
          id="ai-voice-btn"
        >
          <MicIcon size={16} recording={isRecording} />
        </button>

        <input
          ref={inputRef}
          className="ai-panel__text-input term-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening to voice...' : 'Ask Lee or type command (e.g. Summary, What is urgent?)...'}
          disabled={isLoading}
          id="ai-text-input"
        />

        <button
          className="ai-panel__send-btn"
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          aria-label="Send Prompt"
          id="ai-send-btn"
        >
          <SendIcon size={15} />
        </button>
      </div>
    </div>
  );
}

