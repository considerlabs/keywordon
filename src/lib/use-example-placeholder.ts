"use client";

import { useCallback, useState, type FocusEvent } from "react";

/** Show example text as placeholder; hide it while focused (clears on click). */
export function useExamplePlaceholder(example: string) {
  const [focused, setFocused] = useState(false);

  const onFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!event.currentTarget.value.trim()) {
        setFocused(false);
      }
    },
    [],
  );

  return {
    placeholder: focused ? "" : example,
    onFocus,
    onBlur,
  };
}
