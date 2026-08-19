import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth";
import Link from "next/link";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          로그인 준비 중
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Clerk 약관 수락 및 연동 후 로그인을 사용할 수 있습니다.
        </p>
        <Link href="/" className="mt-6 inline-block text-[var(--brand)]">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-5 py-16">
      <SignIn />
    </div>
  );
}