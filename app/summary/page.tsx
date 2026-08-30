import LlmSummary from "./llmsummary";

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full h-full overflow-scroll">
        <LlmSummary />
      </main>
    </div>
  );
}