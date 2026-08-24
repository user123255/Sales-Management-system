interface AuthBrandProps {
  light?: boolean;
}

export default function AuthBrand({
  light = false,
}: AuthBrandProps) {
  return (
    <div className="flex items-center gap-3">

      <div
        className={`
        flex
        h-12
        w-12
        items-center
        justify-center
        rounded-xl
        shadow-lg
        ${
          light
          ? "bg-white"
          : "bg-[#0A2E24]"
        }
        `}
      >
        <span
          className={`
          text-xl
          font-black
          ${
            light
            ? "text-[#0A2E24]"
            : "text-white"
          }
          `}
        >
          S
        </span>
      </div>


      <div>

        <p
          className={`
          text-lg
          font-black
          tracking-tight
          ${
            light
            ? "text-white"
            : "text-[#0A2E24]"
          }
          `}
        >
          SOMS
        </p>


        <p
          className={`
          text-[10px]
          uppercase
          tracking-[0.18em]
          ${
            light
            ? "text-white/60"
            : "text-slate-500"
          }
          `}
        >
          Sales & Order Management System
        </p>

      </div>

    </div>
  );
}