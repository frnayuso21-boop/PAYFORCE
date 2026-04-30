export default function Loading() {
 return (
 <div style={{ padding: "32px"}}>
 {[0, 1, 2, 3, 4].map((i) => (
 <div
 key={i}
 style={{
 height: "20px",
 background: "#F3F4F6",
 borderRadius: "4px",
 marginBottom: "12px",
 width: i === 0 ? "40%": i === 4 ? "70%": "100%",
 animation: "payforce-pulse 1.5s ease-in-out infinite",
 }}
 />
 ))}
 <style>{`@keyframes payforce-pulse {
 0%, 100% { opacity: 1; }
 50% { opacity: 0.5; }
 }
 `}</style>
 </div>
 );
}
