// ============================================================================
// JSON-LD — renders one or more schema.org objects. Server component.
// ============================================================================
export default function JsonLd({ data }) {
  const list = Array.isArray(data) ? data : [data];
  return list.map((obj, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, "\\u003c") }}
    />
  ));
}
