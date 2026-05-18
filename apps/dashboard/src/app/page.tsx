import prisma from "@/lib/prisma";

export default async function AdminHome() {
  const [userCount, roleCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    take: 10,
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      authProvider: true,
      role: { select: { name: true } },
    },
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: "1.5rem" }}>Admin Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Users", value: userCount },
          { label: "Roles", value: roleCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "1.25rem 1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: "0.75rem" }}>Recent Users</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {["Name", "Email", "Auth", "Role"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentUsers.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 12px" }}>{u.name}</td>
              <td style={{ padding: "8px 12px", color: "#555" }}>{u.email}</td>
              <td style={{ padding: "8px 12px" }}>{u.authProvider ?? "credentials"}</td>
              <td style={{ padding: "8px 12px" }}>{u.role?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
