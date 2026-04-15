"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getToken,
  clearToken,
  getUserDetail,
  updateUser,
  disableUserKeys,
  type AdminUserDetail,
} from "@/lib/admin-api";

const PLAN_COLORS: Record<string, string> = {
  flex: "bg-gray-100 text-gray-700",
  light: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  max: "bg-amber-100 text-amber-700",
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newPlan, setNewPlan] = useState("");

  useEffect(() => {
    if (!getToken()) { router.push("/"); return; }
    getUserDetail(Number(id))
      .then((d) => { setDetail(d); setNewPlan(d.user.plan); })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { clearToken(); router.push("/"); return; }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handlePlanChange() {
    if (!detail || newPlan === detail.user.plan) return;
    if (!confirm(`プランを ${detail.user.plan.toUpperCase()} → ${newPlan.toUpperCase()} に変更しますか？`)) return;
    try {
      await updateUser(detail.user.id, { plan: newPlan });
      const d = await getUserDetail(detail.user.id);
      setDetail(d);
      setNewPlan(d.user.plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "失敗");
    }
  }

  async function handleKillSwitch() {
    if (!detail) return;
    if (!confirm(`${detail.user.email} の全 API Key を無効化しますか？この操作は元に戻せません。`)) return;
    try {
      const msg = await disableUserKeys(detail.user.id);
      alert(msg);
      const d = await getUserDetail(detail.user.id);
      setDetail(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "失敗");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  if (!detail) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || "Not found"}</div>;

  const u = detail.user;

  return (
    <div className="min-h-screen">
      <header className="bg-admin-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-admin-100 hover:text-white text-sm">← 一覧</Link>
          <span className="font-bold text-sm">ユーザー詳細</span>
        </div>
        <button onClick={() => { clearToken(); router.push("/"); }} className="text-xs text-admin-100 hover:text-white">
          ログアウト
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
        )}

        {/* User info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{u.email}</h1>
              <p className="text-sm text-gray-500 mt-1">ID: {u.id} · 登録: {new Date(u.created_at).toLocaleDateString("ja-JP")}</p>
              {u.company_name && <p className="text-sm text-gray-500">{u.company_name}</p>}
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${PLAN_COLORS[u.plan] ?? "bg-gray-100"}`}>
              {u.plan.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-xs text-gray-500">API Keys</p>
              <p className="text-lg font-bold">{u.api_key_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">月間リクエスト</p>
              <p className="text-lg font-bold">{u.month_usage.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stripe Customer</p>
              <p className="text-sm font-mono">{u.stripe_customer_id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Subscription</p>
              <p className="text-sm font-mono">{u.stripe_subscription_id ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Plan change */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">プラン変更（管理者オーバーライド）</h2>
            <div className="flex gap-2">
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
              >
                <option value="flex">Flex</option>
                <option value="light">Light</option>
                <option value="pro">Pro</option>
                <option value="max">Max</option>
              </select>
              <button
                onClick={handlePlanChange}
                disabled={newPlan === u.plan}
                className="bg-admin-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-30 hover:bg-admin-800 transition"
              >
                変更
              </button>
            </div>
          </div>

          {/* Kill switch */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-sm font-semibold text-red-700 mb-3">緊急キルスイッチ</h2>
            <p className="text-xs text-gray-500 mb-3">このユーザーの全 API Key を即座に無効化します。</p>
            <button
              onClick={handleKillSwitch}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition"
            >
              全 Key を無効化
            </button>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">API Keys ({detail.keys.length})</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-4 py-2 text-left">プレフィックス</th>
                <th className="px-4 py-2 text-left">プラン</th>
                <th className="px-4 py-2 text-left">レート</th>
                <th className="px-4 py-2 text-left">状態</th>
                <th className="px-4 py-2 text-left">作成日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {detail.keys.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-2 text-sm font-mono">{k.key_prefix}...</td>
                  <td className="px-4 py-2 text-xs">{k.plan.toUpperCase()}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{k.rate_per_sec} req/s</td>
                  <td className="px-4 py-2">
                    {k.is_active
                      ? <span className="text-green-600 text-xs font-medium">有効</span>
                      : <span className="text-gray-400 text-xs">無効</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">{new Date(k.created_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent usage */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">直近リクエスト (最大50件)</h2>
          </div>
          {detail.recent_usage.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">リクエスト履歴なし</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                  <th className="px-4 py-2 text-left">日時</th>
                  <th className="px-4 py-2 text-left">エンドポイント</th>
                  <th className="px-4 py-2 text-left">住所</th>
                  <th className="px-4 py-2 text-left">ステータス</th>
                  <th className="px-4 py-2 text-left">応答時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detail.recent_usage.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(r.created_at).toLocaleString("ja-JP")}</td>
                    <td className="px-4 py-2 text-xs font-mono">{r.endpoint}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">{r.request_address ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${r.response_status < 400 ? "text-green-600" : "text-red-600"}`}>
                        {r.response_status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.processing_time_ms ? `${r.processing_time_ms}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
