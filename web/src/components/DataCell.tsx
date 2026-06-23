type DataCellProps = {
  label: string;
  value: string;
};

export function DataCell({ label, value }: DataCellProps) {
  return (
    <div className="compute-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
