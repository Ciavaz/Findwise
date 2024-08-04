'use client'; // Add this directive at the top of the file

import { useCallback } from 'react';
import { useState } from 'react';
import { saveUserFeedback } from '../lib/actions/chat';
import { usePathname } from 'next/navigation'
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Separator } from '@radix-ui/react-separator';
export type UserFeedbackProps = {
    groupID: string;
};

export function UserFeedback({groupID}: UserFeedbackProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const chatID = usePathname().split('/').pop();

  const handleUserFeedback = useCallback(async (value: boolean) => {
    if (!chatID) {
      return;
    }
    saveUserFeedback(chatID, groupID, value);

    setFeedbackSubmitted(true);
  }, [groupID]);
  
  return (
    <div className="mt-4">
      <hr className="border-gray-300 mb" /> {/* Minimal separator line */}
      <div className="flex items-center justify-between space-x-2">
        <label className="flex-grow text-left text-sm">Ti è stato d'aiuto?</label>
        <div className="flex space-x-4">
          {feedbackSubmitted ? (
            <p className="text-gray-500 transition text-sm">Grazie del feedback! 😊</p>
          ) : (
            <>
              <button
                onClick={() => handleUserFeedback(true)}
                className="flex flex-col items-center text-gray-700 hover:text-green-600 transition"
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">Yes</span>
              </button>
              <button
                onClick={() => handleUserFeedback(false)}
                className="flex flex-col items-center text-gray-700 hover:text-red-600 transition"
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm">No</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}