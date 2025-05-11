interface DynamicButtonProps {
  dynamicBg: string;
  text: string;
  onClick?: () => void; 
}

export function DynamicButton ({ dynamicBg, text, onClick}: DynamicButtonProps) {
  return (
    <button
      className={`flex h-10 items-center rounded-lg ${dynamicBg} w-full text-center `}
      onClick={onClick} 
    >
      <span className="hidden md:block w-full antialiased text-light font-normal tracking-wide text-sm"> {text} </span>{' '}
    </button>
  );
}
