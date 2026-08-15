import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { Role } from "@prisma/client";

const STALL_HOURS = 48;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (!user.organizationId) {
    return (
      <div className="card max-w-md">
        <h1 className="text-lg font-semibold text-brand-navy mb-2">Almost there</h1>
        <p className="text-sm text-gray-500">
          Your account isn't attached to an organization yet. If you were invited, try signing
          out and back in. Otherwise, contact your admin.
        </p>
      </div>
    );
  }

  const isEmployee = user.role === Role.EMPLOYEE;
  const organizationId = user.organizationId as string;

  const [materials, openTasks, recentEvents, newLeadsCount] = await Promise.all([
    prisma.material.findMany({ where: { organizationId } }),
    prisma.sourcingTask.findMany({
      where: {
        organizationId,
        status: { notIn: ["DISTRIBUTED", "UNAVAILABLE"] },
        assignedToId: isEmployee ? user.id : undefined,
      },
      include: { material: true, assignedTo: { select: { name: true } } },
      orderBy: isEmployee ? [{ priority: "desc" }, { lastActivityAt: "asc" }] : { lastActivityAt: "asc" },
    }),
    isEmployee
      ? Promise.resolve([])
      : prisma.taskEvent.findMany({
          take: 10,
          where: { task: { organizationId } },
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { name: true } }, task: { select: { id: true, title: true } } },
        }),
    isEmployee ? Promise.resolve(0) : prisma.lead.count({ where: { organizationId, status: "new" } }),
  ]);

  const lowStock = materials.filter((m) => m.stockOnHand <= m.reorderThreshold);
  const stallCutoff = new Date(Date.now() - STALL_HOURS * 60 * 60 * 1000);
  const stalledTasks = openTasks.filter((t) => t.lastActivityAt < stallCutoff);

  const statusCounts = openTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // ---------------- Employee dashboard: "My Tasks" front and center ----------------
  if (isEmployee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-brand-navy">My Tasks</h1>

        {openTasks.length === 0 ? (
          <div className="card text-sm text-gray-500 animate-fade-in-up">
            Nothing assigned to you right now. Check back later, or ask your manager.
          </div>
        ) : (
          <ul className="space-y-2 animate-fade-in-up">
            {openTasks.map((t) => (
              <li key={t.id} className="card">
                <Link href={`/tasks/${t.id}`} className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-medium text-gray-800">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.material.name} · needs {t.quantityNeeded} {t.material.unit}
                    </div>
                    {stalledTasks.some((s) => s.id === t.id) && (
                      <div className="text-xs text-amber-600 mt-1">
                        No activity {formatDistanceToNow(t.lastActivityAt, { addSuffix: true })} — give it an update
                      </div>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---------------- Admin / Manager dashboard: full org view ----------------
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-navy">Dashboard</h1>

      {/* Status overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
{Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="card text-center animate-fade-in-up">
              <div className="text-2xl font-bold text-brand-navy">{count}</div>
              <div className="mt-1"><StatusBadge status={status} /></div>
            </div>
          ))}
        {openTasks.length === 0 && (
          <div className="col-span-full text-sm text-gray-500">No open sourcing tasks right now.</div>
        )}
      </div>

      {newLeadsCount > 0 && (
        <Link href="/leads" className="card flex items-center justify-between hover:shadow-md transition-shadow border-brand-accent animate-fade-in-up">
          <div>
            <div className="font-semibold text-brand-navy">
              {newLeadsCount} new lead{newLeadsCount === 1 ? "" : "s"} from the website
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Quote/site-visit requests waiting to be reviewed</div>
          </div>
          <span className="text-brand-accent text-sm font-medium">Review →</span>
        </Link>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <div className="card animate-fade-in-up">
          <h2 className="font-semibold text-brand-navy mb-3">Low Stock Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">All materials are above their reorder threshold.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((m) => (
                <li key={m.id} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <Link href={`/materials`} className="font-medium text-gray-800 hover:text-brand-accent">
                    {m.name}
                  </Link>
                  <span className="text-red-600">
                    {m.stockOnHand} / {m.reorderThreshold} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stalled tasks */}
        <div className="card animate-fade-in-up">
          <h2 className="font-semibold text-brand-navy mb-3">
            Stalled Tasks <span className="text-xs text-gray-400 font-normal">(no activity 48h+)</span>
          </h2>
          {stalledTasks.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing stalled — everything's moving.</p>
          ) : (
            <ul className="space-y-2">
              {stalledTasks.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                  <div>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-gray-800 hover:text-brand-accent">
                      {t.title}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {t.assignedTo?.name || "Unassigned"} · last activity{" "}
                      {formatDistanceToNow(t.lastActivityAt, { addSuffix: true })}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="card animate-fade-in-up">
        <h2 className="font-semibold text-brand-navy mb-3">Recent Activity</h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentEvents.map((e) => (
              <li key={e.id} className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">{e.actor.name}</span>{" "}
                {e.type.replace("_", " ").toLowerCase()} on{" "}
                <Link href={`/tasks/${e.task.id}`} className="text-brand-accent hover:underline">
                  {e.task.title}
                </Link>{" "}
                <span className="text-gray-400">
                  · {formatDistanceToNow(e.createdAt, { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
