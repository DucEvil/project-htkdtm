export default function QuantityControl({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  name: string;
}) {
  return (
    <div
      className="quantity-control"
      role="group"
      aria-label={`Số lượng ${name}`}
    >
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={`Giảm số lượng ${name}`}
      >
        −
      </button>
      <output aria-label={`Số phần ${name}`} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
        aria-label={`Tăng số lượng ${name}`}
      >
        +
      </button>
    </div>
  );
}
