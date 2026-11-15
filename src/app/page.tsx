import { ImportDropzone } from "@/components/ImportDropzone";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ChatArchive</h1>
      <ImportDropzone />
    </main>
  );
}
