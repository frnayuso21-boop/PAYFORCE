export default function Loading() {
  return (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          height:       "28px",
          background:   "#F3F4F6",
          borderRadius: "4px",
          marginBottom: "24px",
          width:        "180px",
          animation:    "payforce-pulse 1.5s ease-in-out infinite",
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          style={{
            height:       "56px",
            background:   "#F3F4F6",
            borderRadius: "8px",
            marginBottom: "8px",
            animation:    "payforce-pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes payforce-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
