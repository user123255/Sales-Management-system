import type { ReactNode } from "react";

interface AuthInputProps {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  disabled?: boolean;
  icon?: ReactNode;
  rightElement?: ReactNode;
  autoComplete?: string;
}


export default function AuthInput({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  disabled = false,
  icon,
  rightElement,
  autoComplete,
}: AuthInputProps) {

  return (
    <div>

      <label
        className="
        mb-2
        block
        text-xs
        font-bold
        uppercase
        tracking-wider
        text-slate-600
        "
      >
        {label}
      </label>


      <div className="group relative">

        {icon && (
          <div
            className="
            pointer-events-none
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
            text-slate-400
            transition
            group-focus-within:text-emerald-500
            "
          >
            {icon}
          </div>
        )}


        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}

          className="
          h-12
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          pl-11
          pr-11
          text-sm
          text-slate-900
          outline-none
          transition-all

          placeholder:text-slate-400

          hover:border-slate-300
          hover:bg-white

          focus:border-emerald-500
          focus:bg-white
          focus:ring-4
          focus:ring-emerald-500/10

          disabled:cursor-not-allowed
          disabled:opacity-60
          "
        />


        {rightElement && (
          <div
            className="
            absolute
            right-3.5
            top-1/2
            -translate-y-1/2
            "
          >
            {rightElement}
          </div>
        )}

      </div>

    </div>
  );
}