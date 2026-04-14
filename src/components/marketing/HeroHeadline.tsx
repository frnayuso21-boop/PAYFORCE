export function HeroHeadline() {
  return (
    <h1
      className="text-center text-[40px] leading-[1.05] text-black md:text-[76px] md:leading-[1.0]"
      style={{
        letterSpacing: "-0.05em",
        fontWeight:    200,
        maxWidth:      860,
      }}
    >
      Building happy business
      <br />
      <span style={{ color: "rgba(0,0,0,0.45)", fontWeight: 200 }}>
        with a secure financial payment software.
      </span>
    </h1>
  );
}
