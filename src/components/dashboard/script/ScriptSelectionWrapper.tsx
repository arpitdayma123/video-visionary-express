
import React from 'react';

interface ScriptSelectionWrapperProps {
  children: React.ReactNode;
  handlePreventPropagation: (e: React.MouseEvent) => void;
}

const ScriptSelectionWrapper: React.FC<ScriptSelectionWrapperProps> = ({
  children,
  handlePreventPropagation
}) => {
  return (
    <section 
      className="animate-fade-in border-b border-border pb-8 mb-8" 
      onClick={handlePreventPropagation}
    >
      {children}
    </section>
  );
};

export default ScriptSelectionWrapper;
