import { useState } from "react";

// 1. The helper function (keep it inside or outside the hook)
function parseApiErrors(err) {
  const data = err?.response?.data;
  if (!data) return { __global__: "Une erreur inattendue s'est produite." };
  if (typeof data === "string") return { __global__: data };
  if (data.detail) return { __global__: data.detail };

  if (data.non_field_errors) {
    return {
      __global__: Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join(" ")
        : data.non_field_errors,
    };
  }

  const fieldErrors = {};
  let hasFieldError = false;
  for (const [key, value] of Object.entries(data)) {
    hasFieldError = true;
    fieldErrors[key] = Array.isArray(value) ? value.join(" ") : String(value);
  }
  return hasFieldError
    ? fieldErrors
    : { __global__: "Une erreur inattendue s'est produite." };
}

// 2. The Hook itself (This is what Roles.jsx is looking for)
export function useFormErrors() {
  const [errors, setErrors] = useState({});

  const setApiErrors = (err) => {
    setErrors(parseApiErrors(err));
    console.error("API Errors:", parseApiErrors(err));
  };

  const clearErrors = () => setErrors({});

  // Helper to highlight inputs in Red if they have an error
  const inputCls = (fieldName) => {
    return errors[fieldName] ? "border-red-500 focus:ring-red-500" : "";
  };

  return {
    errors,
    setErrors,
    setApiErrors,
    clearErrors,
    inputCls,
  };
}
