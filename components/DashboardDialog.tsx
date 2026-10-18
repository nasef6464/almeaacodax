import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';

/** Escape dashboard stacking contexts without changing the caller's actions. */
export function DashboardDialog({children,onClose,label,labelledBy,className}: {children:React.ReactNode;onClose:()=>void;label?:string;labelledBy?:string;className:string}) {
 const panel = useRef<HTMLDivElement>(null);
 const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
 useEffect(() => {
  const previousFocus=document.activeElement as HTMLElement|null,previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';focusable()[0]?.focus();
  return()=>{document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus();};
 },[]);
 const onKeyDown=(event:React.KeyboardEvent)=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
  if(event.key!=='Tab')return;const elements=focusable(),first=elements[0],last=elements[elements.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 };
 if(typeof document==='undefined')return null;
 return createPortal(<div dir="rtl" onKeyDown={onKeyDown} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-6">
  <div ref={panel} role="dialog" aria-modal="true" aria-label={label} aria-labelledby={labelledBy} className={'flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden sm:max-h-[calc(100dvh-3rem)] '+className}>{children}</div>
 </div>,document.body);
}
