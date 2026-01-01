interface WavyTitleProps {
  children: string;
}

export default function WavyTitle({ children }: WavyTitleProps) {
  return (
    <h1 className="wavy-title">
      <span>{children}</span>
      <div className="wavy-underline" />
    </h1>
  );
}
