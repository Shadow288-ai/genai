import React, { useState } from "react";
import TenantTable from "../components/TenantTable";
import TenantForm from "../components/TenantForm";
import type { Tenant, TenantFormValues, User } from "../types";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const initialTenants: Tenant[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@tenant.com",
    unit: "A-101",
    phone: "+352 621 000 001",
    status: "Active",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@tenant.com",
    unit: "B-203",
    phone: "+352 621 000 002",
    status: "Late payment",
  },
];

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const handleAddTenant = (tenantData: TenantFormValues) => {
    const { id: _ignored, ...rest } = tenantData;
    const newTenant: Tenant = {
      ...rest,
      id: Date.now(),
    };
    setTenants((prev) => [...prev, newTenant]);
  };

  const handleUpdateTenant = (updatedData: TenantFormValues) => {
    if (!editingTenant) return;

    const updatedTenant: Tenant = {
      ...editingTenant,
      ...updatedData,
      id: editingTenant.id, // ensure id doesn't change
    };

    setTenants((prev) =>
      prev.map((t) => (t.id === editingTenant.id ? updatedTenant : t))
    );
    setEditingTenant(null);
  };

  const handleDeleteTenant = (id: number) => {
    if (window.confirm("Are you sure you want to delete this tenant?")) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
  };

  const handleCancelEdit = () => {
    setEditingTenant(null);
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div>
          <h1>Tenant Dashboard</h1>
          <p className="muted">
            Logged in as <strong>{user.email}</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </header>

      <main className="app-main">
        <section className="card card-large">
          <div className="card-header">
            <h2>Tenants</h2>
            <p className="muted">
              Manage your tenants: add, edit, or remove records.
            </p>
          </div>

          <TenantTable
            tenants={tenants}
            onEdit={handleEditClick}
            onDelete={handleDeleteTenant}
          />
        </section>

        <section className="card card-large">
          <div className="card-header">
            <h2>{editingTenant ? "Edit Tenant" : "Add Tenant"}</h2>
          </div>
          <TenantForm
            key={editingTenant ? editingTenant.id : "new"}
            initialData={editingTenant}
            onSubmit={editingTenant ? handleUpdateTenant : handleAddTenant}
            onCancel={editingTenant ? handleCancelEdit : undefined}
          />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
