import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'gold' | 'purple' | 'ghost' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'cyan', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "relative font-bold text-[11px] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest font-heading overflow-hidden group";
  
  const variants = {
    // Primary Action (Create/Generate) - Cyan Energy
    cyan: "bg-cyan-900/30 text-cyan-100 border border-cyan-500/50 hover:bg-cyan-800/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-sm px-6 py-3",
    
    // Secondary Action (Planning/Architecture) - Golden Divine
    gold: "bg-amber-900/30 text-amber-100 border border-amber-500/50 hover:bg-amber-800/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-sm px-6 py-3",
    
    // Special Action (Review/Critique) - Purple Void
    purple: "bg-purple-900/30 text-purple-100 border border-purple-500/50 hover:bg-purple-800/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-sm px-6 py-3",
    
    // Ghost
    ghost: "bg-transparent text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 rounded-sm px-3 py-2",

    // Icon only
    icon: "p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-full transition-colors"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* UE5 Button Glint Effect */}
      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />

      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="animate-pulse">Đang Diễn Hóa...</span>
        </>
      ) : children}
    </button>
  );
};