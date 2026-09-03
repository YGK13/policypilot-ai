import Link from "next/link";
import JsonLd from "./JsonLd";
import { breadcrumbLd } from "@/lib/marketing/site";

// Visible breadcrumb + BreadcrumbList JSON-LD. items: [{name, path}]
export default function Breadcrumbs({ items }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mk-container">
        <ol className="mk-crumbs">
          {all.map((it, i) => (
            <li key={it.path}>
              {i < all.length - 1 ? <Link href={it.path}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}
