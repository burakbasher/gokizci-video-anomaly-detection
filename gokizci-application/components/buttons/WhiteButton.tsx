interface ButtonProps {
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function WhiteButton({ text, onClick }: ButtonProps) {
  return (
    <button
      className="flex h-9 items-center rounded-lg bg-background-alt w-full border border-primary-light text-center hover:bg-background"
      onClick={onClick}
    >
      <span className="hidden md:block w-full antialiased text-primary-dark font-normal tracking-wide text-sm"> {text} </span>{' '}
    </button>
  );
}