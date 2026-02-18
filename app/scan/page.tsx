import ScanPageClientWrapper from "./ScanPageClientWrapper";

export default function Page({
  searchParams,
}: {
  searchParams?: {
    mode?: string;
    t?: string;
  };
}) {
  return (
    <ScanPageClientWrapper
      mode={searchParams?.mode ?? "scan"}
      token={searchParams?.t ?? ""}
      scanFlag={true}
    />
  );
}
