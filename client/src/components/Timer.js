import React, { useEffect, useState } from "react";

const Timer = ({ totalTime, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(totalTime);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp(); // callback when time ends
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      style={{
        position: "fixed",
        top: "70px",
        right: "30px",
        backgroundColor: "#1e293b",
        color: "white",
        padding: "8px 14px",
        borderRadius: "8px",
        fontWeight: "bold",
        fontSize: "16px",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
      }}
    >
      ⏰ Time Left: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
    </div>
  );
};

export default Timer;
