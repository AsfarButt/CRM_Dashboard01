// Mirrors the (inferred) pattern used by the home route: a server
// component reads the summary JSON via lib/staff.ts and passes the raw,
// serializable data down as a prop to the client component, which does
// any array/derived work itself with plain functions (no fs access
// needed client-side).
//
// If app/home/page.tsx does this differently (e.g. a different prop
// name, or fetches through an API route instead), match this file to
// that pattern instead — this is inferred from lib/sales.ts +
// transformSalesData.ts, not confirmed against the real home page.tsx.

import Staff from "./staff";
import { getStaffSummary } from "../../lib/staff";

export default async function StaffPage() {
  const data = await getStaffSummary();
  return <Staff data={data} />;
}