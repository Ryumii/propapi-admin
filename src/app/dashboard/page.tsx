"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getToken,
  clearToken,
  getStats,
  getUsers,
  disableUserKeys,
  type SystemStats,
  type AdminUserItem,
  type UserListResult,
} from "@/lib/admin-api";

const PLAN_COLORS: Record<string, string> = {
  flex: "bg-gray-100 text-gray-700",
  light: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  max: "bg-amber-100 text-amber-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userResult, setUserResult] = useState<UserListResult | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([
        getStats(),
        getUsers({ page, search: search || undefined, plan: planFilter || undefined }),
      ]);
      setStats(s);
      setUserResult(u);
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err) {
        const status = (err as { status: number }).status;
        if (status === 401 || status === 403) {
          clearToken();
          router.push("/");
          return;
        }
      }
      setError(err instanceof Error ? err.message : "データ取得に失敗");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, router]);

  useEffect(() => {
    if (!getToken()) { router.push("/"); return; }
    load();
  }, [router, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleKillSwitch(userId: number, email: string) {
    if (!confirm(`${email} の全 API Key を無効化しますか？`)) return;
    try {
      const msg = await disableUserKeys(userId);
      alert(msg);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "失敗");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="bg-admin-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-admin-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="font-bold text-sm">PropAPI Admin</span>
        </div>
        <button onClick={() => { clearToken(); router.push("/"); }} className="text-xs text-admin-100 hover:text-white">
          ログアウト
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">閉じる</button>
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Stat label="総ユーザー" value={stats.total_users} />
            <Stat label="アクティブ API Keys" value={stats.active_api_keys} />
            <Stat label="本日リクエスト" value={stats.total_requests_today} />
            <Stat label="月間リクエスト" value={stats.total_requests_month} />
            <Stat label="平均レスポンス" value={stats.avg_response_ms ? `${stats.avg_response_ms}ms` : "—"} />
            {Object.entries(stats.plan_breakdown).map(([plan, cnt]) => (
              <Stat key={plan} label={`${plan.toUpperCase()} ユーザー`} value={cnt} />
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="メール or 会社名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-admin-500 outline-none"
            />
            <button type="submit" className="bg-admin-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-admin-800 transition">
              検索
            </button>
          </form>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-admin-500 outline-none"
          >
            <option value="">全プラン</option>
            <option value="flex">Flex</option>
            <option value="light">Light</option>
            <option value="pro">Pro</option>
            <option value="max">Max</option>
          </select>
          <span className="text-sm text-gray-400 ml-auto">
            {userResult?.total ?? 0} 件
          </span>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">メール</th>
                <th className="px-4 py-3">会社名</th>
                <th className="px-4 py-3">プラン</th>
                <th className="px-4 py-3">Keys</th>
                <th className="px-4 py-3">月間利用</th>
                <th className="px-4 py-3">Stripe</th>
                <th className="px-4 py-3">登録日</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {userResult?.users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <Link href={`/users/${u.id}`} className="text-admin-700 hover:underline">{u.email}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.company_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[u.plan] ?? "bg-gray-100"}`}>
                      {u.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.api_key_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{u.month_usage.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {u.stripe_customer_id ? (
                      <span className="text-green-600 text-xs">連携済</span>
                    ) : (
                      <span className="text-gray-300 text-xs">未連携</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleKillSwitch(u.id, u.email)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="全 Key 無効化"
                    >
                      停止
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!userResult?.users.length) && (
            <p className="text-center text-gray-400 py-8 text-sm">ユーザーがいません</p>
          )}
        </div>

        {/* Pagination */}
        {userResult && userResult.total > 50 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-30"
            >
              前へ
            </button>
            <span className="px-3 py-1 text-sm text-gray-500">Page {page}</span>
            <button
              disabled={page * 50 >= userResult.total}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-30"
            >
              次へ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}
