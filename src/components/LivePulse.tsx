export default function LivePulse({ size = 8 }: { size?: number }) {
  return (
    <span className="relative inline-flex">
      <span
        className="inline-flex rounded-full bg-[#22c55e]"
        style={{ width: size, height: size }}
      />
      <span
        className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75 animate-ping"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
