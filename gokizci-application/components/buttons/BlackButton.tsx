interface ButtonProps {
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const BlackButton = ({ text, disabled = false }: ButtonProps) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`flex h-9 items-center rounded-lg bg-primary w-full border border-primary-dark text-center hover:bg-primary-dark ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="hidden md:block w-full antialiased text-background font-normal tracking-wide text-sm select-none"> {text} </span>{' '}
    </button>
  );
};
