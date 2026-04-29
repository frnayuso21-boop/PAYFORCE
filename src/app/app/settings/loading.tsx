export default function Loading() {
  return (
    <div style={{ padding: "32px", maxWidth: "720px" }}>
      <div
        style={{
          height:       "28px",
          background:   "#F3F4F6",
          borderRadius: "4px",
          marginBottom: "24px",
          width:        "200px",
          animation:    "payforce-pulse 1.5s ease-in-out infinite",
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height:       "120px",
            background:   "#F3F4F6",
            borderRadius: "10px",
            marginBottom: "12px",
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
