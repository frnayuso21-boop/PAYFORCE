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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height:       "120px",
              background:   "#F3F4F6",
              borderRadius: "10px",
              animation:    "payforce-pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height:       "48px",
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
