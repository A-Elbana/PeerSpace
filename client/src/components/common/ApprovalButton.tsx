import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { UserCheck, Loader2 } from 'lucide-react';

interface Props {
  approved: boolean;
  color?: string; // CSS color (hex, rgb, named)
  tooltip?: string;
  isIndicator?: boolean; // when true, render as non-interactive indicator
  /**
   * Optional async handler invoked when user toggles approval.
   * Should return the new approved boolean state.
   */
  onToggle?: (current: boolean) => Promise<boolean> | void;
  size?: number;
  ariaLabel?: string;
}

const ApprovalButton: React.FC<Props> = ({ approved, color = '#10B981', tooltip = '', isIndicator = false, onToggle, size = 16, ariaLabel }) => {
  const [active, setActive] = useState<boolean>(approved);

  useEffect(() => setActive(approved), [approved]);

  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isIndicator) return;
    if (!onToggle) {
      // local toggle if no async handler provided
      setActive(s => !s);
      return;
    }

    try {
      setLoading(true);
      const result = await onToggle(active);
      if (typeof result === 'boolean') setActive(result);
      else {
        // if handler didn't return boolean, optimistically toggle
        setActive(s => !s);
      }
    } finally {
      setLoading(false);
    }
  };

  const commonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid transparent',
    backgroundColor: active ? color : 'transparent',
    color: active ? '#fff' : color,
  };

  const iconProps = { size, 'aria-hidden': true } as any;

  const content = (
    <div style={commonStyle} aria-label={ariaLabel}>
      <UserCheck {...iconProps} />
    </div>
  );

  // When loading, replace with a small spinner to indicate action in progress
  if (loading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!tooltip) {
    return isIndicator ? (
      <div>{content}</div>
    ) : (
      <Button variant="ghost" onClick={handleClick} className="p-0" aria-label={ariaLabel}>
        {content}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {isIndicator ? (
            <div>{content}</div>
          ) : (
            <Button variant="ghost" onClick={handleClick} className="p-0" aria-label={ariaLabel}>
              {content}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ApprovalButton;
