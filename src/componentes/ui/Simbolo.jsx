/* Simbolo de una magnitud con subindice: ["m", "b"] -> m_b */
export default function Simbolo({ partes, className = "" }) {
  const [base, subindice] = partes;
  return (
    <span className={"font-serif italic " + className}>
      {base}
      {subindice && <sub className="not-italic text-[0.7em]">{subindice}</sub>}
    </span>
  );
}
