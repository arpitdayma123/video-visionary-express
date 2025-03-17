
import React from 'react';

interface ErrorMessageProps {
  errorMessage: string | null;
  userStatus: string;
}

const ErrorMessage = ({ errorMessage, userStatus }: ErrorMessageProps) => {
  if (!errorMessage || userStatus !== 'Failed') return null;
  
  return (
    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
      <p className="font-medium">Error:</p>
      <p>{errorMessage}</p>
    </div>
  );
};

export default ErrorMessage;
