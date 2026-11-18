import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface TypingTextProps {
  text: string;
  texts?: string[];
  speed?: number;
  eraseSpeed?: number;
  delay?: number;
  interval?: number; // Time to wait in ms before erasing (e.g. 3000)
  className?: string;
}

export default function TypingText({ 
  text, 
  texts, 
  speed = 30, 
  eraseSpeed = 15, 
  delay = 400, 
  interval = 4000, 
  className 
}: TypingTextProps) {
  const list = texts && texts.length > 0 ? texts : [text];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'erasing' | 'waiting'>('typing');

  // Reset state if list items change significantly
  const serializedList = JSON.stringify(list);
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayedText('');
    setPhase('typing');
  }, [serializedList]);

  useEffect(() => {
    const currentText = list[currentIndex] || '';
    let timer: any;

    if (phase === 'typing') {
      let index = displayedText.length;
      const startTyping = () => {
        timer = setInterval(() => {
          if (index < currentText.length) {
            setDisplayedText(currentText.substring(0, index + 1));
            index++;
          } else {
            clearInterval(timer);
            if (list.length > 1) {
              setPhase('pausing');
            }
          }
        }, speed);
      };

      if (displayedText.length === 0) {
        timer = setTimeout(startTyping, delay);
      } else {
        startTyping();
      }
    } else if (phase === 'pausing') {
      timer = setTimeout(() => {
        setPhase('erasing');
      }, interval);
    } else if (phase === 'erasing') {
      let index = displayedText.length;
      timer = setInterval(() => {
        if (index > 0) {
          setDisplayedText(currentText.substring(0, index - 1));
          index--;
        } else {
          clearInterval(timer);
          setPhase('waiting');
        }
      }, eraseSpeed);
    } else if (phase === 'waiting') {
      timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % list.length);
        setPhase('typing');
      }, 500);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(timer);
    };
  }, [currentIndex, phase, serializedList, speed, eraseSpeed, delay, interval, displayedText]);

  const isBlinking = phase === 'pausing' || phase === 'waiting';

  return (
    <span className={cn("relative inline-block", className)}>
      {displayedText}
      <span 
        className={cn(
          "inline-block w-[3px] h-[0.8em] bg-current ml-1.5 align-middle transition-opacity duration-300",
          isBlinking ? "opacity-100 animate-pulse bg-green-600" : "opacity-100 bg-green-600"
        )}
      />
    </span>
  );
}
