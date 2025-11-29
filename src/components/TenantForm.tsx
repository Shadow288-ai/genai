import React, { useState } from "react";
import type { TenantFormValues, Tenant } from "../types";

interface TenantFormProps {
  initialData?: Tenant | null;
  onSubmit: (tenant: TenantFormValues) => void;
  onCancel?: () => void;
}

const defaultTenant: TenantFormValues = {
  name: "",
  email: "",
  unit: "",
  phone: "",
  status: "Active",
};

const TenantForm: React.FC<TenantFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formValues, setFormValues] = useState<TenantFormValues>(
    initialData ?? defaultTenant
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formValues.name || !formValues.unit) {
      alert("Name and unit are required.");
      return;
    }

    onSubmit(formValues);

    if (!initialData) {
      // Reset form only when adding
      setFormValues(defaultTenant);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="form-label">
        Name *
        <input
          className="form-input"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          placeholder="Tenant name"
        />
      </label>

      <label className="form-label">
        Unit *
        <input
          className="form-input"
          name="unit"
          value={formValues.unit}
          onChange={handleChange}
          placeholder="e.g. A-101"
        />
      </label>

      <label className="form-label">
        Email
        <input
          className="form-input"
          type="email"
          name="email"
          value={formValues.email}
          onChange={handleChange}
          placeholder="tenant@example.com"
        />
      </label>

      <label className="form-label">
        Phone
        <input
          className="form-input"
          name="phone"
          value={formValues.phone}
          onChange={handleChange}
          placeholder="+352 ..."
        />
      </label>

      <label className="form-label">
        Status
        <select
          className="form-input"
          name="status"
          value={formValues.status}
          onChange={handleChange}
        >
          <option value="Active">Active</option>
          <option value="Late payment">Late payment</option>
          <option value="Moved out">Moved out</option>
        </select>
      </label>

      <div className="form-actions">
        <button className="btn-primary" type="submit">
          {initialData ? "Save changes" : "Add tenant"}
        </button>
        {onCancel && (
          <button
            className="btn-secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TenantForm;
