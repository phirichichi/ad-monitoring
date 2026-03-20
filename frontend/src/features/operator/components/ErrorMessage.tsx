// frontend/src/features/operator/components/ErrorMessage.tsx

import type { CSSProperties } from "react";

type ErrorMessageProps = {
  message: string;
};

/**
 * Shared error box for operator pages.
 * Use this instead of repeating red alert box styles.
 */
export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div role="alert" style={styles.box}>
      {message}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    padding: 10,
    borderRadius: 10,
    color: "#7a0000",
    fontSize: 13,
  },
};