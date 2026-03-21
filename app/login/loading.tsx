export default function LoadingLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8">
      <div className="glass-card w-full max-w-md p-8">
        <div className="h-4 w-24 rounded-full bg-[color:var(--skeleton)]" />
        <div className="mt-5 h-12 w-48 rounded-[20px] bg-[color:var(--skeleton)]" />
        <div className="mt-4 h-4 w-full rounded-full bg-[color:var(--skeleton)]" />
        <div className="mt-2 h-4 w-4/5 rounded-full bg-[color:var(--skeleton)]" />
        <div className="mt-8 h-12 w-full rounded-full bg-[color:var(--skeleton)]" />
      </div>
    </div>
  );
}
