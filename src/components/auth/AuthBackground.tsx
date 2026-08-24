export default function AuthBackground() {
  return (
    <>
      <div
        className="
        pointer-events-none
        fixed
        -top-40
        -right-40
        h-96
        w-96
        rounded-full
        bg-emerald-400/10
        blur-[120px]
        "
      />

      <div
        className="
        pointer-events-none
        fixed
        -bottom-40
        -left-40
        h-96
        w-96
        rounded-full
        bg-[#D6A84F]/10
        blur-[120px]
        "
      />

      <div
        className="
        pointer-events-none
        fixed
        inset-0
        opacity-[0.03]
        "
        style={{
          backgroundImage:
            "radial-gradient(#0A2E24 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </>
  );
}