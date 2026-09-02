import Home from "./home";
import { getSalesSummary } from '@/lib/sales';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialData = await getSalesSummary();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full h-full overflow-hidden">
        <Home sales_data={initialData}/>
      </main>
    </div>
  );
}