import React, { useState } from 'react';
import { Paperclip, Link as LinkIcon, Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { cn } from '@/lib/utils';

interface ScheduleTaskCardProps {
    id: string | number;
    title: string;
    type: 'assignment' | 'personal';
    dueDate: Date | null;
    dueTime?: string;
    completed: boolean;
    communityName?: string;
    courseColor?: string;
    description?: string;
    points?: number;
    hasAttachment?: boolean;
    hasLink?: boolean;
    onNavigate?: () => void;
}

// Course color mapping - can be expanded
const getCourseColor = (communityName?: string): string => {
    if (!communityName) return 'bg-gray-400';
    
    const hash = communityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
        'bg-turf-green-500',      // Biology
        'bg-tech-blue-500',        // Math
        'bg-royal-gold-500',       // Chemistry
        'bg-frosted-blue-500',     // Physics
        'bg-purple-500',           // Computer Science
        'bg-pink-500',             // Literature
        'bg-orange-500',           // History
        'bg-cyan-500',             // Art
    ];
    
    return colors[hash % colors.length];
};

const getUrgencyBadge = (dueDate: Date | null, completed: boolean) => {
    if (completed) {
        return null;
    }
    
    if (!dueDate) {
        return { label: 'No Deadline', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    }
    
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) {
        return { label: 'Overdue', variant: 'destructive' as const, className: 'bg-red-500 text-white' };
    } else if (hoursUntilDue < 3) {
        return { label: 'Critical', variant: 'destructive' as const, className: 'bg-red-500 text-white animate-pulse' };
    } else if (hoursUntilDue < 24) {
        return { label: 'Due Today', variant: 'default' as const, className: 'bg-yellow-500 text-black' };
    } else if (hoursUntilDue < 72) {
        return { label: 'Upcoming', variant: 'secondary' as const, className: 'bg-orange-400 text-white' };
    }
    
    return { label: 'Future', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
};

const ScheduleTaskCard: React.FC<ScheduleTaskCardProps> = ({
    id,
    title,
    type,
    dueDate,
    dueTime,
    completed,
    communityName,
    courseColor,
    description,
    points,
    hasAttachment = false,
    hasLink = false,
    onNavigate
}) => {
    const urgencyBadge = getUrgencyBadge(dueDate, completed);
    const leftBorderColor = courseColor || getCourseColor(communityName);
    
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={String(id)} className="border-none">
                <div className={cn(
                    "group relative bg-card border border-border rounded-lg overflow-hidden transition-all duration-200",
                    "hover:shadow-md hover:border-primary/20",
                    completed && "opacity-60"
                )}>
                    {/* Scannability Stripe - 4px left border */}
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", leftBorderColor)} />
                    
                    <div className="pl-6 pr-4 py-4">
                        {/* Header Section */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className={cn(
                                    "font-semibold text-base mb-2 transition-colors",
                                    completed ? "line-through text-muted-foreground" : "text-foreground"
                                )}>
                                    {title}
                                </h3>
                                
                                {/* Metadata Row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {urgencyBadge && (
                                        <Badge className={urgencyBadge.className}>
                                            {urgencyBadge.label}
                                        </Badge>
                                    )}
                                    
                                    {communityName && (
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {communityName}
                                        </span>
                                    )}
                                    
                                    {points !== undefined && (
                                        <span className="text-xs text-muted-foreground">
                                            {points} pts
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Time-Priority Axis - Top Right */}
                            {dueDate && (
                                <div className="flex flex-col items-end gap-1 text-right shrink-0">
                                    <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        {dueTime || dueDate.toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit',
                                            hour12: true 
                                        })}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* Bottom Row - Metadata Affordance Icons */}
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3">
                                {hasAttachment && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        <span>Files</span>
                                    </div>
                                )}
                                
                                {hasLink && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <LinkIcon className="w-3.5 h-3.5" />
                                        <span>Link</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Expandable Trigger */}
                            {(description || type === 'assignment') && (
                                <AccordionTrigger className="py-0 hover:no-underline">
                                    <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Details
                                    </span>
                                </AccordionTrigger>
                            )}
                        </div>
                    </div>
                    
                    {/* Expandable Content */}
                    {(description || type === 'assignment') && (
                        <AccordionContent className="px-6 pb-4">
                            <div className="pt-2 border-t border-border">
                                {description && (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                                        {description}
                                    </p>
                                )}
                                
                                {type === 'assignment' && onNavigate && (
                                    <button
                                        onClick={onNavigate}
                                        className="text-sm text-primary hover:underline font-medium"
                                    >
                                        View Full Assignment →
                                    </button>
                                )}
                            </div>
                        </AccordionContent>
                    )}
                </div>
            </AccordionItem>
        </Accordion>
    );
};

export default ScheduleTaskCard;
