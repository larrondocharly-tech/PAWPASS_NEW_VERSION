import ScanPageClient from "./ScanPageClient";
import ScanPageClientWrapper from "./ScanPageClientWrapper";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function getStr(sp: SP | undefined, key: string): string {
  const v = sp?.[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default function Page({ searchParams }: { searchParams?: SP }) {
  const mode = getStr(searchParams, "mode").toLowerCase();
  const token = getStr(searchParams, "m") || getStr(searchParams, "code");
  const scanFlag = getStr(searchParams, "scan") === "1";

  if (mode !== "redeem") {
    return <ScanPageClient />;
  }

  return (
    <ScanPageClientWrapper mode={mode} token={token} scanFlag={scanFlag} />
  );
}
