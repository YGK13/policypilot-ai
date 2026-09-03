// ============================================================================
// FAQ — native <details>/<summary> accordion: keyboard accessible, no JS,
// crawlable text. Direct answers first (AEO).
// ============================================================================
export default function Faq({ items, groups }) {
  if (groups) {
    return (
      <div className="mk-faq">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mk-faq__group">{g.group}</div>
            {g.items.map((f) => <Item key={f.q} f={f} />)}
          </div>
        ))}
      </div>
    );
  }
  return <div className="mk-faq">{items.map((f) => <Item key={f.q} f={f} />)}</div>;
}

function Item({ f }) {
  return (
    <details>
      <summary>{f.q}</summary>
      <p className="mk-body">{f.a}</p>
    </details>
  );
}
