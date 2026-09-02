import Analytics from "./analytics"
import { getSalesAnalyticsSummary } from "../../lib/salesanalytics"

export default async function Page() {
  let data;
  let error: string | null = null;

  try {
    data = await getSalesAnalyticsSummary();
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
          <main className="w-full h-full overflow-hidden">
        {error || !data ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Couldn't load sales analytics data{error ? `: ${error}` : "."}
          </div>
        ) : (
          <Analytics data={data} />
        )}
      </main>
    </div>
  );
}