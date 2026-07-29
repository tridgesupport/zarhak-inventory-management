import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { updateUserRole } from "./actions";

export default async function UsersPage() {
  const session = await auth();
  const canEdit = session?.user ? canManageUsers(session.user.role) : false;

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const roles = Object.values(Role);

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Users</h1>
      <p className="mt-1 text-sm text-neutral-500">
        New sign-ins land as PENDING until an admin assigns a role.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              {canEdit && <th className="px-4 py-2">Change role</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{u.name ?? "—"}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      u.role === "PENDING"
                        ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        : "rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
                    }
                  >
                    {u.role}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-2">
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No users have signed in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
