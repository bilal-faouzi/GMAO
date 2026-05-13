export function FieldError({ errors, field }) {
  if (!errors[field]) return null;
  return (
    <p className="text-danger text-xs mt-1 flex items-center gap-1">
      <span></span> {errors[field]}
    </p>
  );
}

export function GlobalError({ errors }) {
  if (!errors.__global__) return null;
  return (
    <div className="bg-danger-soft border border-danger/30 rounded-lg px-3 py-2 text-danger text-xs">
      {errors.__global__}
    </div>
  );
}
