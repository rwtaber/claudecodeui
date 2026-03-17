type ShellHeaderProps = {
  isConnected: boolean;
  isInitialized: boolean;
  isRestarting: boolean;
  hasSession: boolean;
  sessionDisplayNameShort: string | null;
  onDisconnect: () => void;
  onRestart: () => void;
  shellMode?: 'claude' | 'plain';
  onToggleShellMode?: () => void;
  statusNewSessionText: string;
  statusInitializingText: string;
  statusRestartingText: string;
  disconnectLabel: string;
  disconnectTitle: string;
  restartLabel: string;
  restartTitle: string;
  disableRestart: boolean;
};

export default function ShellHeader({
  isConnected,
  isInitialized,
  isRestarting,
  hasSession,
  sessionDisplayNameShort,
  onDisconnect,
  onRestart,
  shellMode = 'claude',
  onToggleShellMode,
  statusNewSessionText,
  statusInitializingText,
  statusRestartingText,
  disconnectLabel,
  disconnectTitle,
  restartLabel,
  restartTitle,
  disableRestart,
}: ShellHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />

          {onToggleShellMode && (
            <div className="flex items-center rounded-md bg-gray-700/50 p-0.5">
              <button
                onClick={shellMode === 'plain' ? onToggleShellMode : undefined}
                disabled={isRestarting}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                  shellMode === 'claude'
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                } disabled:cursor-not-allowed disabled:opacity-50`}
                title="Claude Code session"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Claude
              </button>
              <button
                onClick={shellMode === 'claude' ? onToggleShellMode : undefined}
                disabled={isRestarting}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                  shellMode === 'plain'
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                } disabled:cursor-not-allowed disabled:opacity-50`}
                title="Plain terminal"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                Terminal
              </button>
            </div>
          )}

          {hasSession && sessionDisplayNameShort && (
            <span className="text-xs text-blue-300">({sessionDisplayNameShort}...)</span>
          )}

          {!hasSession && <span className="text-xs text-gray-400">{statusNewSessionText}</span>}

          {!isInitialized && <span className="text-xs text-yellow-400">{statusInitializingText}</span>}

          {isRestarting && <span className="text-xs text-blue-400">{statusRestartingText}</span>}
        </div>

        <div className="flex items-center space-x-3">
          {isConnected && (
            <button
              onClick={onDisconnect}
              className="flex items-center space-x-1 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
              title={disconnectTitle}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{disconnectLabel}</span>
            </button>
          )}

          <button
            onClick={onRestart}
            disabled={disableRestart}
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title={restartTitle}
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{restartLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
