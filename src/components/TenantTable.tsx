import React from "react";
import type { Tenant } from "../types";

interface TenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (id: number) => void;
}

const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  onEdit,
  onDelete,
}) => {
  if (!tenants.length) {
    return <p className="muted">No tenants yet. Add your first tenant.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Unit</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th style={{ width: "150px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.unit}</td>
              <td>{tenant.email}</td>
              <td>{tenant.phone}</td>
              <td>{tenant.status}</td>
              <td>
                <div className="table-actions">
                  <button
                    className="btn-link"
                    type="button"
                    onClick={() => onEdit(tenant)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-link danger"
                    type="button"
                    onClick={() => onDelete(tenant.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TenantTable;
