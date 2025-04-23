
import React from 'react';

interface ScriptWebhookErrorProps {
  error: string | null;
}

const ScriptWebhookError: React.FC<ScriptWebhookErrorProps> = ({ error }) => {
  if (!error) return null;
  return (
    <div className="mb-4 p-4 rounded-lg border border-red-300 bg-[#ea384c]/10 flex items-start gap-3">
      <svg width="24" height="24" fill="none" stroke="#ea384c" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#ea384c" fill="none"/>
        <line x1="12" y1="8" x2="12" y2="13" stroke="#ea384c"/>
        <circle cx="12" cy="16" r="1" fill="#ea384c"/>
      </svg>
      <div>
        <div className="font-semibold text-[#ea384c] mb-1">Script Error</div>
        <div className="text-[#ea384c] text-sm">{error}</div>
      </div>
    </div>
  );
};

export default ScriptWebhookError;
