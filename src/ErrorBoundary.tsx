// @ts-nocheck
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-lg w-full flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">A Critical Error Occurred</h2>
              <p className="text-sm text-[#888888] mb-4">The system encountered an unexpected disruption.</p>
              <div className="bg-black/50 p-4 rounded text-left overflow-auto max-h-48 text-xs text-red-300 font-mono">
                {this.state.error?.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-[#00E5FF] transition-colors"
            >
              <RotateCcw size={18} /> Reboot System
            </button>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}
