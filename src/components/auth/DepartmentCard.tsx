import {
  Wallet,
  Beef,
  Building2,
} from "lucide-react";


interface Props {
  title:string;
  description:string;
  value:string;
  selected:boolean;
  onClick:()=>void;
}


const icons:any = {
  Finance: Wallet,
  Butchery: Beef,
  "Other Department": Building2,
};


export default function DepartmentCard({
  title,
  description,
  selected,
  onClick,
}:Props){

  const Icon = icons[title];


  return (

    <button
      type="button"
      onClick={onClick}

      className={`
      flex
      w-full
      items-center
      gap-4
      rounded-2xl
      border
      p-4
      text-left
      transition-all

      ${
        selected
        ?
        "border-emerald-500 bg-emerald-50 shadow-sm"
        :
        "border-slate-200 bg-white hover:border-emerald-300"
      }

      `}
    >


      <div
        className={`
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-xl

        ${
          selected
          ?
          "bg-emerald-500 text-white"
          :
          "bg-slate-100 text-slate-500"
        }

        `}
      >

        <Icon size={20}/>

      </div>


      <div>

        <p
          className="
          text-sm
          font-bold
          text-slate-900
          "
        >
          {title}
        </p>


        <p
          className="
          text-xs
          text-slate-500
          "
        >
          {description}
        </p>

      </div>


    </button>

  );
}