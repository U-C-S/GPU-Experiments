type StepProps = {
  children: string;
  index: string;
  status: string;
  title: string;
};

export function Step({ children, index, status, title }: StepProps) {
  return (
    <article className="step">
      <span className="step-index">{index}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
        <strong>{status}</strong>
      </div>
    </article>
  );
}
